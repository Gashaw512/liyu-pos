-- -- ============================================================================
-- -- 012_rls_helpers.sql
-- -- Domain: Security Abstractions & Policy Predicates
-- -- Dependencies: 002_base_functions.sql, 004_schema_users.sql
-- -- ============================================================================

-- -- Pure security context validator ensuring an active profile session exists
-- CREATE OR REPLACE FUNCTION public.auth_is_profile_active()
-- RETURNS BOOLEAN AS $$
--   SELECT COALESCE(is_active, FALSE)
--   FROM public.profiles
--   WHERE id = auth.uid()
--   AND deleted_at IS NULL;
-- $$
-- LANGUAGE sql
-- SECURITY DEFINER
-- SET search_path = public
-- STABLE;

-- -- Macro-level predicate check used to quickly bypass queries if user profile is invalid
-- CREATE OR REPLACE FUNCTION public.assert_security_context(allowed_roles VARCHAR(30)[])
-- RETURNS BOOLEAN AS $$
-- BEGIN
--   RETURN (
--     public.auth_is_profile_active() AND 
--     public.auth_has_any_role(allowed_roles)
--   );
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE;



-- ============================================================================
-- 012_rls_helpers.sql
----------------------

-- Domain:
--   Security Abstractions & Policy Predicates
----------------------------------------------

-- Dependencies:
--   004_schema_users.sql
-------------------------

-- Purpose:
--   Helper functions used by Row Level Security policies.
----------------------------------------------------------

-- No tables
-- No triggers
-- No indexes
-- No seed data
---------------

-- ============================================================================

-- ============================================================================
-- Return current authenticated user's business_id
-- ============================================================================

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

-- ============================================================================
-- Check whether current authenticated user
-- has at least one of the supplied roles
-----------------------------------------

-- Example:
-- auth_has_any_role(ARRAY['owner','manager'])
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auth_has_any_role(
allowed_roles VARCHAR(30)[]
)
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

-- ============================================================================
-- Verify authenticated profile exists and is active
-- ============================================================================

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

-- ============================================================================
-- Composite security validator
-------------------------------

-- Example:
-- assert_security_context(ARRAY['owner'])
------------------------------------------

-- Returns TRUE only when:
--   1. Profile exists
--   2. Profile is active
--   3. User has one of supplied roles
-- ============================================================================

CREATE OR REPLACE FUNCTION public.assert_security_context(
allowed_roles VARCHAR(30)[]
)
RETURNS BOOLEAN AS $$
BEGIN
RETURN (
public.auth_is_profile_active()
AND
public.auth_has_any_role(allowed_roles)
);
END;
$$
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE;
