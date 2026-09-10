-- ============================================================================
-- 018_fix_categories_rls.sql
-- Domain: Category RLS Hardening
--
-- Purpose:
--   Replace the old broad category FOR ALL policy with explicit
--   operation-specific tenant-aware policies.
--
-- Security model:
--   SELECT:
--     Any authenticated user in the same business can read active categories.
--
--   INSERT:
--     Owner and manager only.
--
--   UPDATE:
--     Owner and manager only.
--
--   DELETE:
--     Owner only for physical DELETE.
--
--   SOFT DELETE:
--     The application performs:
--
--       UPDATE categories
--       SET deleted_at = timestamp,
--           is_active = false
--
--     Therefore:
--       USING requires deleted_at IS NULL.
--       WITH CHECK must NOT require deleted_at IS NULL.
--
--   TENANT ISOLATION:
--     All write operations validate:
--
--       business_id = public.auth_business_id()
--
-- ============================================================================


-- ============================================================================
-- 1. ENABLE RLS
-- ============================================================================

ALTER TABLE public.categories
ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- 2. REMOVE OLD / PREVIOUS CATEGORY POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Category access isolation"
ON public.categories;

DROP POLICY IF EXISTS "categories_tenant_select"
ON public.categories;

DROP POLICY IF EXISTS "categories_tenant_insert"
ON public.categories;

DROP POLICY IF EXISTS "categories_tenant_update"
ON public.categories;

DROP POLICY IF EXISTS "categories_tenant_delete"
ON public.categories;

DROP POLICY IF EXISTS "categories_owner_soft_delete"
ON public.categories;


-- ============================================================================
-- 3. SELECT POLICY
-- ============================================================================
--
-- Any authenticated user belonging to the same business can read
-- active categories.
--
-- Soft-deleted categories remain in the database but are hidden.
-- ============================================================================

CREATE POLICY "categories_tenant_select"
ON public.categories
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  business_id = public.auth_business_id()
  AND deleted_at IS NULL
);


-- ============================================================================
-- 4. INSERT POLICY
-- ============================================================================
--
-- Only owner and manager can create categories.
--
-- The new row must belong to the authenticated user's business.
-- ============================================================================

CREATE POLICY "categories_tenant_insert"
ON public.categories
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  business_id = public.auth_business_id()
  AND public.auth_has_any_role(
    ARRAY[
      'owner',
      'manager'
    ]::varchar(30)[]
  )
);


-- ============================================================================
-- 5. UPDATE POLICY
-- ============================================================================
--
-- USING:
--   Protects the EXISTING row.
--
-- WITH CHECK:
--   Protects the RESULTING row.
--
-- IMPORTANT:
--   WITH CHECK intentionally does NOT require:
--
--     deleted_at IS NULL
--
--   because soft delete changes:
--
--     OLD: deleted_at = NULL
--     NEW: deleted_at = timestamp
--
--   Business isolation is still enforced on the resulting row.
-- ============================================================================

CREATE POLICY "categories_tenant_update"
ON public.categories
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (
  business_id = public.auth_business_id()
  AND deleted_at IS NULL
  AND public.auth_has_any_role(
    ARRAY[
      'owner',
      'manager'
    ]::varchar(30)[]
  )
)
WITH CHECK (
  business_id = public.auth_business_id()
  AND public.auth_has_any_role(
    ARRAY[
      'owner',
      'manager'
    ]::varchar(30)[]
  )
);


-- ============================================================================
-- 6. PHYSICAL DELETE POLICY
-- ============================================================================
--
-- The application normally uses soft delete through UPDATE.
--
-- This policy protects against a physical DELETE.
--
-- Only owner can physically delete an active category belonging
-- to their own business.
-- ============================================================================

CREATE POLICY "categories_tenant_delete"
ON public.categories
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (
  business_id = public.auth_business_id()
  AND deleted_at IS NULL
  AND public.auth_has_any_role(
    ARRAY[
      'owner'
    ]::varchar(30)[]
  )
);


-- ============================================================================
-- 7. DOCUMENT SECURITY MODEL
-- ============================================================================

COMMENT ON TABLE public.categories IS
'Business-scoped POS categories. Active categories are tenant-isolated. Authenticated users can read active categories in their own business. Owners and managers can create and update categories. Application deletion is implemented as a soft delete through UPDATE. Physical DELETE is owner-only.';


-- ============================================================================
-- 8. VERIFY RLS ENABLEMENT
-- ============================================================================
--
-- rowsecurity = true means RLS is enabled.
--
-- Do NOT use forcerowsecurity here. It is not exposed by pg_tables
-- in this environment.
-- ============================================================================

SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'categories';


-- ============================================================================
-- 9. VERIFY CATEGORY POLICIES
-- ============================================================================

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'categories'
ORDER BY policyname;


-- ============================================================================
-- 10. VERIFY POLICY COUNT
-- ============================================================================
--
-- Expected:
--
--   policy_count = 4
--
-- ============================================================================

SELECT
  COUNT(*) AS policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'categories';