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
--   DROP POLICY IF EXISTS is intentional because this migration may be
--   replayed against a database where these policies were already created
--   manually during development.
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
-- 3. REMOVE PREVIOUS VERSIONS OF EXPLICIT POLICIES
-- ============================================================================

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
-- Cashiers/staff may need to read these groups because product pricing
-- can depend on Bono/price-group configuration.
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
--   Confirms the existing row belongs to the authenticated user's
--   business and that the user is owner/manager.
--
-- WITH CHECK:
--   Confirms the resulting row still belongs to the same business
--   and the user remains authorized.
--
-- This prevents cross-tenant business_id changes.
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
-- If the application uses deleted_at for soft deletion, the UPDATE
-- policy above controls that operation.
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
-- 8. DOCUMENT SECURITY MODEL
-- ============================================================================

COMMENT ON TABLE public.price_groups IS
'Business-scoped Bono/price groups. Readable by authenticated users within the tenant; manageable only by owner or manager through RLS.';


-- ============================================================================
-- 9. VERIFICATION
-- ============================================================================

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