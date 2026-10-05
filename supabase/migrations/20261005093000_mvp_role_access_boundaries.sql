-- Enforce the existing single-profile-role model at the database boundary.
-- Tenant filters remain in every policy; this narrows access within a tenant.

CREATE OR REPLACE FUNCTION public.prevent_self_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() = OLD.id AND (
    NEW.role IS DISTINCT FROM OLD.role OR
    NEW.business_id IS DISTINCT FROM OLD.business_id OR
    NEW.branch_id IS DISTINCT FROM OLD.branch_id OR
    NEW.is_active IS DISTINCT FROM OLD.is_active OR
    NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
  ) THEN
    RAISE EXCEPTION 'You cannot change your own role or business access.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_self_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_self_role_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_self_role_escalation();

DROP POLICY IF EXISTS "Profiles are readable by co-workers within the same business" ON public.profiles;
CREATE POLICY "Profiles visible to self and management" ON public.profiles
  FOR SELECT USING (
    business_id = public.auth_business_id()
    AND (id = auth.uid() OR public.auth_has_any_role(ARRAY['owner', 'manager']))
  );
DROP POLICY IF EXISTS "Management can modify subordinate profiles" ON public.profiles;
CREATE POLICY "Management can modify subordinate profiles" ON public.profiles
  FOR ALL USING (
    business_id = public.auth_business_id()
    AND (
      public.auth_has_any_role(ARRAY['owner'])
      OR (public.auth_has_any_role(ARRAY['manager']) AND role <> 'owner')
    )
  ) WITH CHECK (
    business_id = public.auth_business_id()
    AND (
      public.auth_has_any_role(ARRAY['owner'])
      OR (public.auth_has_any_role(ARRAY['manager']) AND role <> 'owner')
    )
  );

-- Menu data remains readable to operational POS roles. Catalog writes are
-- limited to management and the existing inventory clerk role.
DROP POLICY IF EXISTS "Category access isolation" ON public.categories;
CREATE POLICY "Categories readable by business staff" ON public.categories
  FOR SELECT USING (business_id = public.auth_business_id() AND deleted_at IS NULL);
CREATE POLICY "Categories managed by authorized staff" ON public.categories
  FOR ALL USING (
    business_id = public.auth_business_id()
    AND deleted_at IS NULL
    AND public.auth_has_any_role(ARRAY['owner', 'manager', 'inventory_clerk'])
  ) WITH CHECK (
    business_id = public.auth_business_id()
    AND public.auth_has_any_role(ARRAY['owner', 'manager', 'inventory_clerk'])
  );

DROP POLICY IF EXISTS "Product access isolation" ON public.products;
CREATE POLICY "Products readable by business staff" ON public.products
  FOR SELECT USING (business_id = public.auth_business_id() AND deleted_at IS NULL);
CREATE POLICY "Products managed by authorized staff" ON public.products
  FOR ALL USING (
    business_id = public.auth_business_id()
    AND deleted_at IS NULL
    AND public.auth_has_any_role(ARRAY['owner', 'manager', 'inventory_clerk'])
  ) WITH CHECK (
    business_id = public.auth_business_id()
    AND public.auth_has_any_role(ARRAY['owner', 'manager', 'inventory_clerk'])
  );

DROP POLICY IF EXISTS "Inventory records isolation" ON public.inventory;
CREATE POLICY "Inventory readable by operational staff" ON public.inventory
  FOR SELECT USING (
    business_id = public.auth_business_id()
    AND public.auth_has_any_role(ARRAY['owner', 'manager', 'inventory_clerk'])
  );
CREATE POLICY "Inventory managed by authorized staff" ON public.inventory
  FOR ALL USING (
    business_id = public.auth_business_id()
    AND public.auth_has_any_role(ARRAY['owner', 'manager', 'inventory_clerk'])
  ) WITH CHECK (
    business_id = public.auth_business_id()
    AND public.auth_has_any_role(ARRAY['owner', 'manager', 'inventory_clerk'])
  );

DROP POLICY IF EXISTS "Purchases system isolation" ON public.purchases;
CREATE POLICY "Purchases managed by authorized staff" ON public.purchases
  FOR ALL USING (
    business_id = public.auth_business_id()
    AND deleted_at IS NULL
    AND public.auth_has_any_role(ARRAY['owner', 'manager', 'inventory_clerk'])
  ) WITH CHECK (
    business_id = public.auth_business_id()
    AND public.auth_has_any_role(ARRAY['owner', 'manager', 'inventory_clerk'])
  );
DROP POLICY IF EXISTS "Purchase items system isolation" ON public.purchase_items;
CREATE POLICY "Purchase items managed by authorized staff" ON public.purchase_items
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.purchases p WHERE p.id = purchase_id
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM public.purchases p WHERE p.id = purchase_id
  ));
DROP POLICY IF EXISTS "Supplier management isolation" ON public.suppliers;
CREATE POLICY "Suppliers visible to inventory operators" ON public.suppliers
  FOR SELECT USING (
    business_id = public.auth_business_id()
    AND deleted_at IS NULL
    AND public.auth_has_any_role(ARRAY['owner', 'manager', 'inventory_clerk'])
  );
CREATE POLICY "Suppliers managed by authorized staff" ON public.suppliers
  FOR ALL USING (
    business_id = public.auth_business_id()
    AND deleted_at IS NULL
    AND public.auth_has_any_role(ARRAY['owner', 'manager', 'inventory_clerk'])
  ) WITH CHECK (
    business_id = public.auth_business_id()
    AND public.auth_has_any_role(ARRAY['owner', 'manager', 'inventory_clerk'])
  );

DROP POLICY IF EXISTS "Inventory ledger movements isolation" ON public.inventory_movements;
CREATE POLICY "Inventory movements readable by authorized staff" ON public.inventory_movements
  FOR SELECT USING (
    business_id = public.auth_business_id()
    AND public.auth_has_any_role(ARRAY['owner', 'manager', 'inventory_clerk'])
  );
CREATE POLICY "Inventory movements recorded by authorized staff" ON public.inventory_movements
  FOR INSERT WITH CHECK (
    business_id = public.auth_business_id()
    AND public.auth_has_any_role(ARRAY['owner', 'manager', 'inventory_clerk'])
  );
CREATE POLICY "Inventory movements managed by authorized staff" ON public.inventory_movements
  FOR UPDATE USING (
    business_id = public.auth_business_id()
    AND public.auth_has_any_role(ARRAY['owner', 'manager', 'inventory_clerk'])
  ) WITH CHECK (
    business_id = public.auth_business_id()
    AND public.auth_has_any_role(ARRAY['owner', 'manager', 'inventory_clerk'])
  );
CREATE POLICY "Inventory movements deleted by management" ON public.inventory_movements
  FOR DELETE USING (
    business_id = public.auth_business_id()
    AND public.auth_has_any_role(ARRAY['owner', 'manager'])
  );

DROP POLICY IF EXISTS "Sales transactional isolation" ON public.sales;
CREATE POLICY "Sales visible to authorized operators" ON public.sales
  FOR SELECT USING (
    business_id = public.auth_business_id()
    AND deleted_at IS NULL
    AND (
      public.auth_has_any_role(ARRAY['owner', 'manager'])
      OR (public.auth_has_any_role(ARRAY['cashier', 'barman']) AND cashier_id = auth.uid())
    )
  );
CREATE POLICY "Sales recorded by authorized operators" ON public.sales
  FOR INSERT WITH CHECK (
    business_id = public.auth_business_id()
    AND (
      public.auth_has_any_role(ARRAY['owner', 'manager'])
      OR (public.auth_has_any_role(ARRAY['cashier', 'barman']) AND cashier_id = auth.uid())
    )
  );
CREATE POLICY "Sales updated by authorized operators" ON public.sales
  FOR UPDATE USING (
    business_id = public.auth_business_id()
    AND (
      public.auth_has_any_role(ARRAY['owner', 'manager'])
      OR (public.auth_has_any_role(ARRAY['cashier', 'barman']) AND cashier_id = auth.uid())
    )
  ) WITH CHECK (
    business_id = public.auth_business_id()
    AND (
      public.auth_has_any_role(ARRAY['owner', 'manager'])
      OR (public.auth_has_any_role(ARRAY['cashier', 'barman']) AND cashier_id = auth.uid())
    )
  );
CREATE POLICY "Sales deleted by management" ON public.sales
  FOR DELETE USING (
    business_id = public.auth_business_id()
    AND public.auth_has_any_role(ARRAY['owner', 'manager'])
  );

DROP POLICY IF EXISTS "Sale items line tracking isolation" ON public.sale_items;
CREATE POLICY "Sale items visible to authorized operators" ON public.sale_items
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.sales s WHERE s.id = sale_id
  ));
CREATE POLICY "Sale items recorded with authorized sales" ON public.sale_items
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.sales s WHERE s.id = sale_id
  ));
CREATE POLICY "Sale items updated with authorized sales" ON public.sale_items
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.sales s WHERE s.id = sale_id
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM public.sales s WHERE s.id = sale_id
  ));
CREATE POLICY "Sale items deleted with authorized sales" ON public.sale_items
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM public.sales s WHERE s.id = sale_id
      AND public.auth_has_any_role(ARRAY['owner', 'manager'])
  ));

DROP POLICY IF EXISTS "Payment ledger transaction isolation" ON public.payments;
CREATE POLICY "Payments visible to authorized operators" ON public.payments
  FOR SELECT USING (
    business_id = public.auth_business_id()
    AND EXISTS (SELECT 1 FROM public.sales s WHERE s.id = sale_id)
  );
CREATE POLICY "Payments recorded with authorized sales" ON public.payments
  FOR INSERT WITH CHECK (
    business_id = public.auth_business_id()
    AND EXISTS (SELECT 1 FROM public.sales s WHERE s.id = sale_id)
  );
CREATE POLICY "Payments updated with authorized sales" ON public.payments
  FOR UPDATE USING (
    business_id = public.auth_business_id()
    AND EXISTS (SELECT 1 FROM public.sales s WHERE s.id = sale_id)
  ) WITH CHECK (
    business_id = public.auth_business_id()
    AND EXISTS (SELECT 1 FROM public.sales s WHERE s.id = sale_id)
  );
CREATE POLICY "Payments deleted by management" ON public.payments
  FOR DELETE USING (
    business_id = public.auth_business_id()
    AND public.auth_has_any_role(ARRAY['owner', 'manager'])
  );

DROP POLICY IF EXISTS "Operational shifts tracking isolation" ON public.shifts;
CREATE POLICY "Shifts visible to authorized operators" ON public.shifts
  FOR SELECT USING (
    business_id = public.auth_business_id()
    AND (
      public.auth_has_any_role(ARRAY['owner', 'manager'])
      OR (public.auth_has_any_role(ARRAY['cashier']) AND cashier_id = auth.uid())
    )
  );
CREATE POLICY "Shifts recorded by authorized operators" ON public.shifts
  FOR INSERT WITH CHECK (
    business_id = public.auth_business_id()
    AND (
      public.auth_has_any_role(ARRAY['owner', 'manager'])
      OR (public.auth_has_any_role(ARRAY['cashier']) AND cashier_id = auth.uid())
    )
  );
CREATE POLICY "Shifts updated by authorized operators" ON public.shifts
  FOR UPDATE USING (
    business_id = public.auth_business_id()
    AND (
      public.auth_has_any_role(ARRAY['owner', 'manager'])
      OR (public.auth_has_any_role(ARRAY['cashier']) AND cashier_id = auth.uid())
    )
  ) WITH CHECK (
    business_id = public.auth_business_id()
    AND (
      public.auth_has_any_role(ARRAY['owner', 'manager'])
      OR (public.auth_has_any_role(ARRAY['cashier']) AND cashier_id = auth.uid())
    )
  );
CREATE POLICY "Shifts deleted by management" ON public.shifts
  FOR DELETE USING (
    business_id = public.auth_business_id()
    AND public.auth_has_any_role(ARRAY['owner', 'manager'])
  );

DROP POLICY IF EXISTS "Operational business expenses isolation" ON public.expenses;
CREATE POLICY "Business expenses managed by management" ON public.expenses
  FOR ALL USING (
    business_id = public.auth_business_id()
    AND deleted_at IS NULL
    AND public.auth_has_any_role(ARRAY['owner', 'manager'])
  ) WITH CHECK (
    business_id = public.auth_business_id()
    AND public.auth_has_any_role(ARRAY['owner', 'manager'])
  );

DROP POLICY IF EXISTS "Stock audit reconciliations isolation" ON public.stock_reconciliations;
CREATE POLICY "Stock reconciliations managed by authorized staff" ON public.stock_reconciliations
  FOR ALL USING (
    business_id = public.auth_business_id()
    AND public.auth_has_any_role(ARRAY['owner', 'manager', 'inventory_clerk'])
  ) WITH CHECK (
    business_id = public.auth_business_id()
    AND public.auth_has_any_role(ARRAY['owner', 'manager', 'inventory_clerk'])
  );

-- Waiters and cashiers may use the restaurant table workflow, while only
-- management can configure the tables themselves.
DROP POLICY IF EXISTS "Restaurant tables isolation" ON public.restaurant_tables;
CREATE POLICY "Restaurant tables visible to POS staff" ON public.restaurant_tables
  FOR SELECT USING (
    business_id = public.auth_business_id()
    AND deleted_at IS NULL
    AND public.auth_has_any_role(ARRAY['owner', 'manager', 'cashier', 'waiter', 'barman', 'kitchen'])
  );
CREATE POLICY "Restaurant tables managed by management" ON public.restaurant_tables
  FOR ALL USING (
    business_id = public.auth_business_id()
    AND deleted_at IS NULL
    AND public.auth_has_any_role(ARRAY['owner', 'manager'])
  ) WITH CHECK (
    business_id = public.auth_business_id()
    AND public.auth_has_any_role(ARRAY['owner', 'manager'])
  );

DROP POLICY IF EXISTS open_table_orders_select ON public.open_table_orders;
DROP POLICY IF EXISTS open_table_orders_insert ON public.open_table_orders;
DROP POLICY IF EXISTS open_table_orders_update ON public.open_table_orders;
DROP POLICY IF EXISTS open_table_orders_delete ON public.open_table_orders;
CREATE POLICY open_table_orders_select ON public.open_table_orders
  FOR SELECT TO authenticated USING (
    business_id = public.auth_business_id()
    AND branch_id = (SELECT branch_id FROM public.profiles WHERE id = auth.uid() AND deleted_at IS NULL)
    AND public.auth_has_any_role(ARRAY['owner', 'manager', 'cashier', 'waiter'])
  );
CREATE POLICY open_table_orders_insert ON public.open_table_orders
  FOR INSERT TO authenticated WITH CHECK (
    business_id = public.auth_business_id()
    AND branch_id = (SELECT branch_id FROM public.profiles WHERE id = auth.uid() AND deleted_at IS NULL)
    AND cashier_id = auth.uid()
    AND public.auth_has_any_role(ARRAY['owner', 'manager', 'cashier', 'waiter'])
  );
CREATE POLICY open_table_orders_update ON public.open_table_orders
  FOR UPDATE TO authenticated USING (
    business_id = public.auth_business_id()
    AND branch_id = (SELECT branch_id FROM public.profiles WHERE id = auth.uid() AND deleted_at IS NULL)
    AND public.auth_has_any_role(ARRAY['owner', 'manager', 'cashier', 'waiter'])
  ) WITH CHECK (
    business_id = public.auth_business_id()
    AND branch_id = (SELECT branch_id FROM public.profiles WHERE id = auth.uid() AND deleted_at IS NULL)
    AND public.auth_has_any_role(ARRAY['owner', 'manager', 'cashier', 'waiter'])
  );
CREATE POLICY open_table_orders_delete ON public.open_table_orders
  FOR DELETE TO authenticated USING (
    business_id = public.auth_business_id()
    AND branch_id = (SELECT branch_id FROM public.profiles WHERE id = auth.uid() AND deleted_at IS NULL)
    AND public.auth_has_any_role(ARRAY['owner', 'manager', 'cashier'])
  );

CREATE OR REPLACE FUNCTION public.prevent_waiter_table_order_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
    AND public.auth_has_any_role(ARRAY['waiter'])
    AND NOT public.auth_has_any_role(ARRAY['owner', 'manager', 'cashier'])
    AND NEW.status <> 'open'
  THEN
    RAISE EXCEPTION 'Only a cashier or manager can complete or cancel a table order.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_waiter_table_order_completion ON public.open_table_orders;
CREATE TRIGGER trg_prevent_waiter_table_order_completion
  BEFORE UPDATE ON public.open_table_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_waiter_table_order_completion();
