-- ============================================================
-- 014_SYNC_EXISTING_PROFILE_ROLES
-- ============================================================
-- Purpose:
-- Keep profile_roles synchronized with profiles.role.
--
-- This is an incremental repair migration.
-- It does NOT replace the existing RBAC architecture.
-- ============================================================


-- ============================================================
-- 1. ENSURE ROLE-SYNC FUNCTION EXISTS
-- ============================================================

CREATE OR REPLACE FUNCTION public.sync_profile_role_to_matrix()
RETURNS TRIGGER AS $$
BEGIN

  IF NEW.role IS NOT NULL THEN

    INSERT INTO public.profile_roles (
      profile_id,
      role_name
    )
    VALUES (
      NEW.id,
      NEW.role
    )
    ON CONFLICT (
      profile_id,
      role_name
    )
    DO NOTHING;

  END IF;

  RETURN NEW;

END;
$$
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;


-- ============================================================
-- 2. ENSURE ROLE-SYNC TRIGGER EXISTS
-- ============================================================

DROP TRIGGER IF EXISTS trg_sync_profile_role_to_matrix
ON public.profiles;

CREATE TRIGGER trg_sync_profile_role_to_matrix
AFTER INSERT OR UPDATE OF role
ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_role_to_matrix();


-- ============================================================
-- 3. BACKFILL EXISTING PROFILE ROLES
-- ============================================================
-- Existing users may have a valid profiles.role but no
-- corresponding profile_roles entry.
--
-- This inserts the missing matrix entries without creating
-- duplicates.
-- ============================================================

INSERT INTO public.profile_roles (
  profile_id,
  role_name
)
SELECT
  p.id,
  p.role
FROM public.profiles p
WHERE p.role IS NOT NULL
  AND p.deleted_at IS NULL
ON CONFLICT (
  profile_id,
  role_name
)
DO NOTHING;


-- ============================================================
-- 4. VERIFICATION
-- ============================================================
-- This should show at least the current user's owner role
-- after the migration has completed.
-- ============================================================

SELECT
  pr.profile_id,
  pr.role_name,
  p.business_id,
  p.role AS profile_role
FROM public.profile_roles pr
JOIN public.profiles p
  ON p.id = pr.profile_id
WHERE p.deleted_at IS NULL
ORDER BY p.business_id, pr.profile_id, pr.role_name;

