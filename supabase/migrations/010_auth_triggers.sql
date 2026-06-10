-- ============================================================================
-- 010_auth_triggers.sql
-- Domain: Supabase Identity State Hook Automations
-- Dependencies: 004_schema_users.sql
-- ============================================================================

-- ─── 1. STANDARD REGISTER AUTOMATION HOOK ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user_registration()
RETURNS TRIGGER AS $$
DECLARE
    new_business_id UUID;
    new_branch_id UUID;
    biz_name TEXT;
    biz_type TEXT;
    full_name_val TEXT;
BEGIN
    biz_name := COALESCE(NEW.raw_user_meta_data->>'business_name', 'My Store');
    biz_type := COALESCE(NEW.raw_user_meta_data->>'business_type', 'other');
    full_name_val := COALESCE(NEW.raw_user_meta_data->>'full_name', 'Owner');

    INSERT INTO public.businesses (name, type, phone, plan, currency)
    VALUES (biz_name, biz_type, NEW.phone, 'starter', 'ETB')
    RETURNING id INTO new_business_id;

    INSERT INTO public.branches (business_id, name, phone, is_main, is_active)
    VALUES (new_business_id, 'ዋና ቅርንጫፍ (Main Branch)', NEW.phone, TRUE, TRUE)
    RETURNING id INTO new_branch_id;

    INSERT INTO public.profiles (id, business_id, branch_id, full_name, phone, role, language, onboarding_completed, onboarding_step, is_active)
    VALUES (NEW.id, new_business_id, new_branch_id, full_name_val, NEW.phone, 'owner', 'am', FALSE, 'welcome', TRUE);

    INSERT INTO public.onboarding_progress (business_id, current_step, is_completed)
    VALUES (new_business_id, 'welcome', FALSE);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    WHEN (NEW.raw_user_meta_data->>'is_staff' IS NULL OR (NEW.raw_user_meta_data->>'is_staff')::BOOLEAN = FALSE)
    EXECUTE FUNCTION public.handle_new_user_registration();


-- ─── 2. STAFF INVITATION ACTIVATION ENGINE (CLEAN MATRIX VERSION) ───────────
CREATE OR REPLACE FUNCTION public.handle_staff_signup_activation()
RETURNS TRIGGER AS $$
DECLARE
    target_business_id UUID;
    target_role TEXT;
    invitation_id UUID;
BEGIN
    IF (NEW.raw_user_meta_data->>'is_staff')::BOOLEAN = TRUE THEN
        
        -- Row locking (FOR UPDATE) effectively prevents signup race-conditions
        SELECT id, business_id, role_assigned 
        INTO invitation_id, target_business_id, target_role
        FROM public.staff_invitations
        WHERE code = UPPER(TRIM(NEW.raw_user_meta_data->>'invite_code')) 
          AND status = 'pending' 
        FOR UPDATE;

        IF invitation_id IS NOT NULL THEN
            
            INSERT INTO public.profiles (id, full_name, phone, business_id, role, updated_at)
            VALUES (
                NEW.id, 
                COALESCE(NEW.raw_user_meta_data->>'full_name', 'Staff Member'), 
                NEW.phone, 
                target_business_id, 
                target_role, 
                NOW()
            );

            INSERT INTO public.profile_roles (profile_id, role_name, assigned_at)
            VALUES (NEW.id, target_role, NOW())
            ON CONFLICT DO NOTHING;

            UPDATE public.staff_invitations
            SET status = 'used', 
                claimed_by_profile_id = NEW.id, 
                used_at = NOW()
            WHERE id = invitation_id;

        ELSE
            RAISE EXCEPTION 'Access Denied: The activation code provided is invalid, expired, or already used.';
        END IF;

    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_staff_signup ON auth.users;
CREATE TRIGGER on_staff_signup
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    WHEN ((NEW.raw_user_meta_data->>'is_staff')::BOOLEAN = TRUE)
    EXECUTE FUNCTION public.handle_staff_signup_activation();