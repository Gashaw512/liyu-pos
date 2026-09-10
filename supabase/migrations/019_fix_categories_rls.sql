-- ============================================================
-- 015_fix_categories_rls.sql
-- ============================================================
-- CATEGORY RLS HARDENING
-- ============================================================
--
-- PURPOSE
--   Replace the old broad category FOR ALL policy with
--   explicit operation-specific policies.
--
-- SECURITY MODEL
--   SELECT:
--     All authenticated users can see active categories
--     belonging to their own business.
--
--   INSERT:
--     Owner and manager only.
--
--   UPDATE:
--     Owner and manager only.
--
--   DELETE:
--     Owner only for a physical DELETE.
--
-- SOFT DELETE
--   The application does NOT physically delete categories.
--
--   deleteCategory() performs:
--
--       UPDATE categories
--       SET
--         deleted_at = timestamp,
--         is_active = false
--
--   Therefore:
--
--     USING must require deleted_at IS NULL
--     WITH CHECK must NOT require deleted_at IS NULL
--
--   Otherwise PostgreSQL would reject the resulting row because
--   the UPDATE intentionally changes deleted_at from NULL to a
--   timestamp.
--
-- TENANT ISOLATION
--   Every write operation validates:
--
--       business_id = public.auth_business_id()
--
--   Therefore a client cannot move/create a category in
--   another business.
--
-- ============================================================


-- ============================================================
-- 1. ENABLE RLS
-- ============================================================

ALTER TABLE public.categories
ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 2. REMOVE OLD CATEGORY POLICIES
-- ============================================================
--
-- The original schema used:
--
--   "Category access isolation"
--   FOR ALL
--
-- Remove it completely.
--
-- Also remove previous versions of the explicit policies so
-- this migration can safely recreate them.
-- ============================================================

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


-- ============================================================
-- 3. SELECT POLICY
-- ============================================================
--
-- Who can read categories?
--
-- Any authenticated user belonging to the same business.
--
-- Deleted categories remain in the database but are hidden
-- from the normal application.
--
-- Roles:
--   owner
--   manager
--   cashier
--   inventory_clerk
--
-- All authenticated users can SELECT active categories as
-- long as they belong to the same business.
-- ============================================================

CREATE POLICY "categories_tenant_select"
ON public.categories
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  business_id = public.auth_business_id()
  AND deleted_at IS NULL
);


-- ============================================================
-- 4. INSERT POLICY
-- ============================================================
--
-- Only owner and manager can create categories.
--
-- The submitted business_id MUST equal the authenticated
-- user's business.
--
-- This prevents:
--
--   INSERT business_id = another_business
--
-- ============================================================

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


-- ============================================================
-- 5. UPDATE POLICY
-- ============================================================
--
-- Owner and manager can update active categories belonging
-- to their own business.
--
-- ------------------------------------------------------------
-- USING
-- ------------------------------------------------------------
--
-- USING determines which EXISTING rows may be updated.
--
-- Therefore the OLD row must:
--
--   1. Belong to the authenticated business
--   2. Not already be soft-deleted
--   3. Be operated on by owner/manager
--
-- ------------------------------------------------------------
-- WITH CHECK
-- ------------------------------------------------------------
--
-- WITH CHECK determines whether the RESULTING row is allowed.
--
-- IMPORTANT:
--
-- DO NOT add:
--
--   deleted_at IS NULL
--
-- to WITH CHECK.
--
-- A soft delete intentionally changes:
--
--   OLD:
--     deleted_at = NULL
--
--   NEW:
--     deleted_at = timestamp
--
-- Therefore requiring deleted_at IS NULL in WITH CHECK would
-- make the soft delete impossible.
--
-- We DO continue checking business_id so a user cannot move
-- a category into another business.
-- ============================================================

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


-- ============================================================
-- 6. PHYSICAL DELETE POLICY
-- ============================================================
--
-- The application currently uses SOFT DELETE through UPDATE.
--
-- This policy exists only to protect the table if somebody
-- eventually attempts:
--
--   DELETE FROM categories ...
--
-- Only an owner may physically delete an active category
-- belonging to their own business.
--
-- ============================================================

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


-- ============================================================
-- 7. DOCUMENT SECURITY MODEL
-- ============================================================

COMMENT ON TABLE public.categories IS
'Business-scoped POS categories. Active categories are tenant-isolated. Authenticated users can read active categories in their own business. Owners and managers can create and update categories. Application deletion is implemented as a soft delete through UPDATE. Physical DELETE is owner-only.';


-- ============================================================
-- 8. VERIFY RLS ENABLEMENT
-- ============================================================

SELECT
  schemaname,
  tablename,
  rowsecurity,
  forcerowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'categories';


-- ============================================================
-- 9. VERIFY CATEGORY POLICIES
-- ============================================================
--
-- Expected policies:
--
--   categories_tenant_delete
--   categories_tenant_insert
--   categories_tenant_select
--   categories_tenant_update
--
-- ============================================================

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
ORDER BY
  policyname;


-- ============================================================
-- 10. VERIFY POLICY COUNT
-- ============================================================
--
-- Expected result:
--
--   policy_count = 4
--
-- ============================================================

SELECT
  COUNT(*) AS policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'categories';