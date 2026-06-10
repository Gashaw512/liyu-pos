-- ============================================================================
-- 012_rls_helpers.sql
-- Domain: Security Abstractions & Policy Predicates
-- Dependencies: 002_base_functions.sql, 004_schema_users.sql
-- ============================================================================

-- Pure security context validator ensuring an active profile session exists
CREATE OR REPLACE FUNCTION public.auth_is_profile_active()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(is_active, FALSE)
  FROM public.profiles
  WHERE id = auth.uid()
  AND deleted_at IS NULL;
$$
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE;

-- Macro-level predicate check used to quickly bypass queries if user profile is invalid
CREATE OR REPLACE FUNCTION public.assert_security_context(allowed_roles VARCHAR(30)[])
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    public.auth_is_profile_active() AND 
    public.auth_has_any_role(allowed_roles)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE;