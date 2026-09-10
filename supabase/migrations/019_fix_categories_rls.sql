
-- ============================================================
-- 015_fix_categories_rls.sql
-- ============================================================
-- CATEGORY RLS HARDENING
-- ============================================================
--
-- Purpose:
--   Replace the old broad FOR ALL policy with explicit
--   operation-specific policies.
--
-- Security model:
--   - All access is restricted to the authenticated user's
--     business.
--   - Owner and manager can create categories.
--   - Owner and manager can update categories.
--   - Owner can hard-delete categories.
--   - Cashiers can view categories but cannot create, update,
--     or delete them.
--
-- Important:
--   Categories use SOFT DELETE.
--
--   deleteCategory() performs:
--
--       UPDATE categories
--       SET deleted_at = timestamp,
--           is_active = false
--
--   Therefore the UPDATE policy's WITH CHECK must NOT require
--   deleted_at IS NULL.
--
-- ============================================================


-- ============================================================
-- 1. ENABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.categories
ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 2. REMOVE OLD / PREVIOUS CATEGORY POLICIES
-- ============================================================
--
-- Remove the original broad FOR ALL policy.
--

DROP POLICY IF EXISTS "Category access isolation"
ON public.categories;


--
-- Remove previous hardened policies so this migration is
-- safely re-runnable.
--

DROP POLICY IF EXISTS "categories_tenant_select"
ON public.categories;

DROP POLICY IF EXISTS "categories_tenant_insert"
ON public.categories;

DROP POLICY IF EXISTS "categories_tenant_update"
ON public.categories;

DROP POLICY IF EXISTS "categories_tenant_delete"
ON public.categories;


-- ============================================================
-- 3. SELECT POLICY
-- ============================================================
--
-- Owner, manager and cashier can view categories.
--
-- Requirements:
--   1. Category belongs to authenticated business.
--   2. Category is not soft-deleted.
--
-- This keeps deleted categories invisible to the normal
-- application.
-- ============================================================

CREATE POLICY "categories_tenant_select"
ON public.categories
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
-- The business_id supplied by the client must match the
-- authenticated user's business.
--
-- This prevents a user from creating a category inside
-- another business by supplying another business_id.
-- ============================================================

CREATE POLICY "categories_tenant_insert"
ON public.categories
FOR INSERT
TO authenticated
WITH CHECK (
  business_id = public.auth_business_id()
  AND public.auth_has_any_role(
    ARRAY['owner', 'manager']::VARCHAR(30)[]
  )
);


-- ============================================================
-- 5. UPDATE POLICY
-- ============================================================
--
-- Owner and manager can update categories belonging to their
-- own business.
--
-- USING:
--   Controls which EXISTING rows can be updated.
--
--   The existing category must:
--     - belong to the authenticated business
--     - currently not be soft-deleted
--
-- WITH CHECK:
--   Controls the RESULTING row after the update.
--
--   IMPORTANT:
--   We intentionally DO NOT check:
--
--       deleted_at IS NULL
--
--   here.
--
--   This allows a legitimate soft delete:
--
--       deleted_at = NULL
--            ->
--       deleted_at = timestamp
--
--   while still preventing the category from being moved
--   into another business.
-- ============================================================

CREATE POLICY "categories_tenant_update"
ON public.categories
FOR UPDATE
TO authenticated
USING (
  business_id = public.auth_business_id()
  AND deleted_at IS NULL
  AND public.auth_has_any_role(
    ARRAY['owner', 'manager']::VARCHAR(30)[]
  )
)
WITH CHECK (
  business_id = public.auth_business_id()
  AND public.auth_has_any_role(
    ARRAY['owner', 'manager']::VARCHAR(30)[]
  )
);


-- ============================================================
-- 6. DELETE POLICY
-- ============================================================
--
-- Hard DELETE is owner-only.
--
-- The current application does NOT perform a hard DELETE.
-- deleteCategory() performs a soft DELETE through UPDATE.
--
-- This policy protects the table if a future operation
-- attempts a real DELETE.
--
-- Only an owner can hard-delete an active category belonging
-- to their own business.
-- ============================================================

CREATE POLICY "categories_tenant_delete"
ON public.categories
FOR DELETE
TO authenticated
USING (
  business_id = public.auth_business_id()
  AND deleted_at IS NULL
  AND public.auth_has_any_role(
    ARRAY['owner']::VARCHAR(30)[]
  )
);


-- ============================================================
-- 7. DOCUMENT THE SECURITY MODEL
-- ============================================================

COMMENT ON TABLE public.categories IS
'Business-scoped POS categories. Active categories are tenant-isolated. Owner and manager may create and update categories. Soft deletion is performed through UPDATE by setting deleted_at and is_active=false. Hard DELETE is owner-only.';


-- ============================================================
-- 8. VERIFICATION
-- ============================================================
--
-- After running this migration, this query should show
-- exactly four category policies:
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
ORDER BY policyname;

