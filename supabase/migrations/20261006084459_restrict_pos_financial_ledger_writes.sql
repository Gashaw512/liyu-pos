-- Client-side POS roles must use the authenticated sync endpoint for
-- transaction writes. That endpoint validates the operator and processes the
-- sale with the server-only service role; direct client writes could otherwise
-- change a completed receipt or its payment ledger after checkout.
-- Reads remain governed by the existing business/operator-scoped policies.

-- Inventory clerks can receive stock and manage the stock ledger, but cannot
-- change the catalog or its base prices. Owners and managers retain the
-- existing product/category management workflow.
DROP POLICY IF EXISTS "Categories managed by authorized staff" ON public.categories;
CREATE POLICY "Categories managed by management" ON public.categories
  FOR ALL USING (
    business_id = public.auth_business_id()
    AND deleted_at IS NULL
    AND public.auth_has_any_role(ARRAY['owner', 'manager'])
  ) WITH CHECK (
    business_id = public.auth_business_id()
    AND public.auth_has_any_role(ARRAY['owner', 'manager'])
  );

DROP POLICY IF EXISTS "Products managed by authorized staff" ON public.products;
CREATE POLICY "Products managed by management" ON public.products
  FOR ALL USING (
    business_id = public.auth_business_id()
    AND deleted_at IS NULL
    AND public.auth_has_any_role(ARRAY['owner', 'manager'])
  ) WITH CHECK (
    business_id = public.auth_business_id()
    AND public.auth_has_any_role(ARRAY['owner', 'manager'])
  );

DROP POLICY IF EXISTS "Sales recorded by authorized operators" ON public.sales;
DROP POLICY IF EXISTS "Sales updated by authorized operators" ON public.sales;
DROP POLICY IF EXISTS "Sales deleted by management" ON public.sales;

CREATE POLICY "Sales inserted by management" ON public.sales
  FOR INSERT WITH CHECK (
    business_id = public.auth_business_id()
    AND public.auth_has_any_role(ARRAY['owner', 'manager'])
  );
CREATE POLICY "Sales updated by management" ON public.sales
  FOR UPDATE USING (
    business_id = public.auth_business_id()
    AND public.auth_has_any_role(ARRAY['owner', 'manager'])
  ) WITH CHECK (
    business_id = public.auth_business_id()
    AND public.auth_has_any_role(ARRAY['owner', 'manager'])
  );
CREATE POLICY "Sales deleted by management" ON public.sales
  FOR DELETE USING (
    business_id = public.auth_business_id()
    AND public.auth_has_any_role(ARRAY['owner', 'manager'])
  );

DROP POLICY IF EXISTS "Sale items recorded with authorized sales" ON public.sale_items;
DROP POLICY IF EXISTS "Sale items updated with authorized sales" ON public.sale_items;
DROP POLICY IF EXISTS "Sale items deleted with authorized sales" ON public.sale_items;

CREATE POLICY "Sale items inserted by management" ON public.sale_items
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.sales s
    WHERE s.id = sale_id
      AND s.business_id = public.auth_business_id()
      AND public.auth_has_any_role(ARRAY['owner', 'manager'])
  ));
CREATE POLICY "Sale items updated by management" ON public.sale_items
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.sales s
    WHERE s.id = sale_id
      AND s.business_id = public.auth_business_id()
      AND public.auth_has_any_role(ARRAY['owner', 'manager'])
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM public.sales s
    WHERE s.id = sale_id
      AND s.business_id = public.auth_business_id()
      AND public.auth_has_any_role(ARRAY['owner', 'manager'])
  ));
CREATE POLICY "Sale items deleted by management" ON public.sale_items
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM public.sales s
    WHERE s.id = sale_id
      AND s.business_id = public.auth_business_id()
      AND public.auth_has_any_role(ARRAY['owner', 'manager'])
  ));

DROP POLICY IF EXISTS "Payments recorded with authorized sales" ON public.payments;
DROP POLICY IF EXISTS "Payments updated with authorized sales" ON public.payments;
DROP POLICY IF EXISTS "Payments deleted by management" ON public.payments;

CREATE POLICY "Payments inserted by management" ON public.payments
  FOR INSERT WITH CHECK (
    business_id = public.auth_business_id()
    AND EXISTS (
      SELECT 1 FROM public.sales s
      WHERE s.id = sale_id
        AND s.business_id = public.auth_business_id()
        AND public.auth_has_any_role(ARRAY['owner', 'manager'])
    )
  );
CREATE POLICY "Payments updated by management" ON public.payments
  FOR UPDATE USING (
    business_id = public.auth_business_id()
    AND EXISTS (
      SELECT 1 FROM public.sales s
      WHERE s.id = sale_id
        AND s.business_id = public.auth_business_id()
        AND public.auth_has_any_role(ARRAY['owner', 'manager'])
    )
  ) WITH CHECK (
    business_id = public.auth_business_id()
    AND EXISTS (
      SELECT 1 FROM public.sales s
      WHERE s.id = sale_id
        AND s.business_id = public.auth_business_id()
        AND public.auth_has_any_role(ARRAY['owner', 'manager'])
    )
  );
CREATE POLICY "Payments deleted by management" ON public.payments
  FOR DELETE USING (
    business_id = public.auth_business_id()
    AND public.auth_has_any_role(ARRAY['owner', 'manager'])
  );
