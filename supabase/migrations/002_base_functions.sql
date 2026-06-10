-- =========================================================
-- 002_base_functions.sql
-- Shared helper functions used throughout Liyu POS
-- No tables | No triggers | No RLS policies
-- =========================================================

-- 1. Safe Auto-update updated_at timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Return current authenticated user's business_id (Used heavily by RLS)
CREATE OR REPLACE FUNCTION public.auth_business_id()
RETURNS UUID AS $$
    SELECT business_id
    FROM public.profiles
    WHERE id = auth.uid()
    AND deleted_at IS NULL
    LIMIT 1;
$$
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE;

-- 3. Check whether current authenticated user has at least one of the supplied roles
-- Example usage: auth_has_any_role(ARRAY['owner','manager'])
CREATE OR REPLACE FUNCTION public.auth_has_any_role(allowed_roles VARCHAR(30)[])
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profile_roles
        WHERE profile_id = auth.uid()
        AND role_name = ANY(allowed_roles)
    );
$$
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE;
