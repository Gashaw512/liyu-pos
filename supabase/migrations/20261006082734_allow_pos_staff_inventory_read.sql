-- POS users need current stock counts to serve customers, but should only
-- read inventory for their own assigned branch. Existing owner/manager and
-- inventory_clerk access remains provided by the operational-staff policy.
DROP POLICY IF EXISTS "Inventory readable by POS staff in assigned branch"
  ON public.inventory;

CREATE POLICY "Inventory readable by POS staff in assigned branch"
  ON public.inventory
  FOR SELECT
  USING (
    business_id = public.auth_business_id()
    AND public.auth_has_any_role(ARRAY['cashier', 'waiter', 'barman'])
    AND branch_id = (
      SELECT profile.branch_id
      FROM public.profiles AS profile
      WHERE profile.id = (SELECT auth.uid())
        AND profile.business_id = inventory.business_id
      LIMIT 1
    )
  );
