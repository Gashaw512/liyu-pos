-- ============================================================================
-- 017_fix_price_groups_rls.sql
-- Domain: Price Group / Bono RLS Hardening
--
-- Purpose:
--   Replace the old broad price_groups policy with explicit
--   tenant-aware CRUD policies.
--
-- Security model:
--   - Users can only access price groups belonging to their business.
--   - Any authenticated user in the business can SELECT.
--   - Only owner/manager can INSERT.
--   - Only owner/manager can UPDATE.
--   - Only owner/manager can DELETE.
--   - UPDATE protects both the existing and resulting business_id.
--   - RLS remains enabled.
--
-- NOTE:
--   DROP POLICY IF EXISTS is intentional because these policies may have
--   already been created manually during development.
-- ============================================================================


-- ============================================================================
-- 1. ENSURE RLS IS ENABLED
-- ============================================================================

ALTER TABLE public.price_groups
ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- 2. REMOVE OLD BROAD POLICY
-- ============================================================================

DROP POLICY IF EXISTS "Bono pricing groups isolation"
ON public.price_groups;


-- ============================================================================
-- 3. REMOVE EXISTING EXPLICIT POLICIES
-- ============================================================================
--
-- This makes the migration safe if these policies were already created
-- manually in Supabase SQL Editor.
--

DROP POLICY IF EXISTS "price_groups_tenant_select"
ON public.price_groups;

DROP POLICY IF EXISTS "price_groups_management_insert"
ON public.price_groups;

DROP POLICY IF EXISTS "price_groups_management_update"
ON public.price_groups;

DROP POLICY IF EXISTS "price_groups_management_delete"
ON public.price_groups;


-- ============================================================================
-- 4. SELECT
-- ============================================================================
--
-- Any authenticated user belonging to the same business can read
-- price groups.
--
-- This allows cashiers/staff to read pricing information generated
-- from Bono/price groups.
--

CREATE POLICY "price_groups_tenant_select"
ON public.price_groups
FOR SELECT
TO authenticated
USING (
  business_id = public.auth_business_id()
);


-- ============================================================================
-- 5. INSERT
-- ============================================================================
--
-- Only owner/manager can create price groups.
--
-- WITH CHECK validates the NEW row.
--

CREATE POLICY "price_groups_management_insert"
ON public.price_groups
FOR INSERT
TO authenticated
WITH CHECK (
  business_id = public.auth_business_id()
  AND public.auth_has_any_role(
    ARRAY['owner', 'manager']::varchar(30)[]
  )
);


-- ============================================================================
-- 6. UPDATE
-- ============================================================================
--
-- USING:
--   Protects the existing row.
--
-- WITH CHECK:
--   Protects the resulting row.
--
-- This prevents a user from moving a price group to another business
-- by changing business_id.
--

CREATE POLICY "price_groups_management_update"
ON public.price_groups
FOR UPDATE
TO authenticated
USING (
  business_id = public.auth_business_id()
  AND public.auth_has_any_role(
    ARRAY['owner', 'manager']::varchar(30)[]
  )
)
WITH CHECK (
  business_id = public.auth_business_id()
  AND public.auth_has_any_role(
    ARRAY['owner', 'manager']::varchar(30)[]
  )
);


-- ============================================================================
-- 7. DELETE
-- ============================================================================
--
-- Hard DELETE is restricted to owner/manager.
--
-- If the application uses deleted_at for soft deletion, that operation
-- is controlled through UPDATE.
--

CREATE POLICY "price_groups_management_delete"
ON public.price_groups
FOR DELETE
TO authenticated
USING (
  business_id = public.auth_business_id()
  AND public.auth_has_any_role(
    ARRAY['owner', 'manager']::varchar(30)[]
  )
);


-- ============================================================================
-- 8. DOCUMENT THE SECURITY MODEL
-- ============================================================================

COMMENT ON TABLE public.price_groups IS
'Business-scoped Bono/price groups. Readable by authenticated users within the tenant; manageable only by owner or manager through RLS.';


-- ============================================================================
-- 9. VERIFY RLS ENABLEMENT
-- ============================================================================
--
-- rowsecurity = true means RLS is enabled.
--

SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'price_groups';


-- ============================================================================
-- 10. VERIFY POLICIES
-- ============================================================================
--
-- Expected: 4 explicit policies.
--

SELECT
  policyname,
  cmd,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'price_groups'
ORDER BY policyname;