-- Restrict anonymous invitation access. Public validation is handled by the
-- server route, which returns only a boolean and never returns invitation rows.
DROP POLICY IF EXISTS "Public invite validation"
  ON public.staff_invitations;

CREATE OR REPLACE FUNCTION public.handle_staff_signup_activation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  invitation public.staff_invitations%ROWTYPE;
  invited_branch_id UUID;
  submitted_name TEXT;
  invited_name TEXT;
  submitted_phone TEXT;
  invited_phone TEXT;
BEGIN
  IF lower(coalesce(NEW.raw_user_meta_data->>'is_staff', 'false')) <> 'true' THEN
    RETURN NEW;
  END IF;

  SELECT *
  INTO invitation
  FROM public.staff_invitations
  WHERE upper(btrim(code)) = upper(btrim(NEW.raw_user_meta_data->>'invite_code'))
    AND status = 'pending'
    AND (expires_at IS NULL OR expires_at > now())
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This invitation is invalid, expired, or already used.';
  END IF;

  submitted_name := regexp_replace(
    lower(btrim(coalesce(NEW.raw_user_meta_data->>'full_name', ''))),
    '[[:space:]]+', ' ', 'g'
  );
  invited_name := regexp_replace(
    lower(btrim(coalesce(invitation.staff_name, ''))),
    '[[:space:]]+', ' ', 'g'
  );

  IF submitted_name = '' OR submitted_name <> invited_name THEN
    RAISE EXCEPTION 'The name does not match this invitation.';
  END IF;

  submitted_phone := regexp_replace(coalesce(NEW.phone, ''), '[^0-9]', '', 'g');
  invited_phone := regexp_replace(coalesce(invitation.phone, ''), '[^0-9]', '', 'g');

  IF left(submitted_phone, 1) = '0' THEN
    submitted_phone := '251' || substr(submitted_phone, 2);
  END IF;
  IF left(invited_phone, 1) = '0' THEN
    invited_phone := '251' || substr(invited_phone, 2);
  END IF;

  IF submitted_phone !~ '^251[79][0-9]{8}$'
    OR invited_phone !~ '^251[79][0-9]{8}$'
    OR submitted_phone <> invited_phone THEN
    RAISE EXCEPTION 'The phone number does not match this invitation.';
  END IF;

  IF invitation.role_assigned NOT IN (
    'manager', 'cashier', 'inventory_clerk', 'waiter', 'barman', 'kitchen'
  ) THEN
    RAISE EXCEPTION 'This invitation has an invalid staff role.';
  END IF;

  SELECT id
  INTO invited_branch_id
  FROM public.branches
  WHERE business_id = invitation.business_id
    AND is_main = true
    AND is_active = true
  ORDER BY created_at, id
  LIMIT 1;

  IF invited_branch_id IS NULL THEN
    RAISE EXCEPTION 'The invited business has no active main branch.';
  END IF;

  INSERT INTO public.profiles (
    id,
    business_id,
    branch_id,
    full_name,
    phone,
    role,
    language,
    is_active,
    onboarding_completed,
    onboarding_step
  )
  VALUES (
    NEW.id,
    invitation.business_id,
    invited_branch_id,
    invitation.staff_name,
    invitation.phone,
    invitation.role_assigned,
    'am',
    true,
    true,
    'complete'
  );

  INSERT INTO public.profile_roles (profile_id, role_name, assigned_at)
  VALUES (NEW.id, invitation.role_assigned, now())
  ON CONFLICT (profile_id, role_name) DO NOTHING;

  UPDATE public.staff_invitations
  SET status = 'used',
      claimed_by_profile_id = NEW.id,
      used_at = now()
  WHERE id = invitation.id;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user_registration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_business_id UUID;
  new_branch_id UUID;
  business_name TEXT;
  business_type TEXT;
  owner_name TEXT;
BEGIN
  business_name := coalesce(nullif(btrim(NEW.raw_user_meta_data->>'business_name'), ''), 'My Store');
  business_type := coalesce(nullif(btrim(NEW.raw_user_meta_data->>'business_type'), ''), 'other');
  owner_name := coalesce(nullif(btrim(NEW.raw_user_meta_data->>'full_name'), ''), 'Owner');

  INSERT INTO public.businesses (name, type, phone, plan, currency)
  VALUES (business_name, business_type, NEW.phone, 'starter', 'ETB')
  RETURNING id INTO new_business_id;

  INSERT INTO public.branches (business_id, name, phone, is_main, is_active)
  VALUES (new_business_id, 'Main Branch', NEW.phone, true, true)
  RETURNING id INTO new_branch_id;

  INSERT INTO public.profiles (
    id, business_id, branch_id, full_name, phone, role, language,
    onboarding_completed, onboarding_step, is_active
  )
  VALUES (
    NEW.id, new_business_id, new_branch_id, owner_name, NEW.phone, 'owner', 'am',
    false, 'welcome', true
  );

  INSERT INTO public.onboarding_progress (business_id, current_step, is_completed)
  VALUES (new_business_id, 'welcome', false);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_staff_signup ON auth.users;
CREATE TRIGGER on_staff_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  WHEN (lower(coalesce(NEW.raw_user_meta_data->>'is_staff', 'false')) = 'true')
  EXECUTE FUNCTION public.handle_staff_signup_activation();

-- Do not provision an owner workspace for malformed staff metadata.
DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  WHEN (lower(coalesce(NEW.raw_user_meta_data->>'is_staff', 'false')) IN ('', 'false'))
  EXECUTE FUNCTION public.handle_new_user_registration();

REVOKE ALL ON FUNCTION public.handle_staff_signup_activation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user_registration() FROM PUBLIC, anon, authenticated;
