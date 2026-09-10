-- ============================================================================
-- 014_fix_price_groups_rls.sql
-- Domain: Price Group / Bono RLS Hardening
--
-- Purpose:
--   Incrementally replace the existing broad price_groups FOR ALL policy
--   with explicit tenant-aware CRUD policies.
--
-- Security model:
--   - User must belong to the same business as the record.
--   - Only owner/manager can manage price groups.
--   - INSERT uses WITH CHECK.
--   - UPDATE protects both existing and new business_id.
--   - DELETE is restricted to owner/manager.
--   - RLS remains enabled.
-- ============================================================================


-- ============================================================================
-- 1. ENSURE RLS IS ENABLED
-- ============================================================================

ALTER TABLE public.price_groups
ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- 2. REMOVE THE OLD BROAD POLICY
-- ============================================================================
--
-- This is intentionally incremental.
--
-- We are NOT disabling RLS.
-- We are only replacing the existing price-group policy with
-- clearer operation-specific policies.
--

DROP POLICY IF EXISTS "Bono pricing groups isolation"
ON public.price_groups;


-- ============================================================================
-- 3. SELECT
-- ============================================================================
--
-- Any authenticated user inside the same business can read
-- price groups.
--
-- This is important because cashiers/staff may need to see
-- product pricing generated from Bono groups even though they
-- cannot manage the groups themselves.
--

CREATE POLICY "price_groups_tenant_select"
ON public.price_groups
FOR SELECT
TO authenticated
USING (
  business_id = public.auth_business_id()
);


-- ============================================================================
-- 4. INSERT
-- ============================================================================
--
-- Only owner/manager can create a price group.
--
-- WITH CHECK is critical for INSERT.
--
-- It verifies the NEW row rather than an existing row.
--

CREATE POLICY "price_groups_management_insert"
ON public.price_groups
FOR INSERT
TO authenticated
WITH CHECK (
  business_id = public.auth_business_id()
  AND public.auth_has_any_role(
    ARRAY['owner', 'manager']
  )
);


-- ============================================================================
-- 5. UPDATE
-- ============================================================================
--
-- USING:
--   Protects the existing row.
--
-- WITH CHECK:
--   Protects the resulting NEW row.
--
-- This prevents an owner/manager from updating a legitimate
-- price group and changing business_id to another tenant.
--

CREATE POLICY "price_groups_management_update"
ON public.price_groups
FOR UPDATE
TO authenticated
USING (
  business_id = public.auth_business_id()
  AND public.auth_has_any_role(
    ARRAY['owner', 'manager']
  )
)
WITH CHECK (
  business_id = public.auth_business_id()
  AND public.auth_has_any_role(
    ARRAY['owner', 'manager']
  )
);


-- ============================================================================
-- 6. DELETE
-- ============================================================================
--
-- Restricted to owner/manager.
--
-- Note:
-- Your application already has deleted_at for soft deletion.
-- This policy still protects a hard DELETE if one is ever attempted.
--

CREATE POLICY "price_groups_management_delete"
ON public.price_groups
FOR DELETE
TO authenticated
USING (
  business_id = public.auth_business_id()
  AND public.auth_has_any_role(
    ARRAY['owner', 'manager']
  )
);


-- ============================================================================
-- 7. DOCUMENT THE SECURITY MODEL
-- ============================================================================

COMMENT ON TABLE public.price_groups IS
'Business-scoped Bono/price groups. Readable within the tenant; manageable only by owner or manager through RLS.';

