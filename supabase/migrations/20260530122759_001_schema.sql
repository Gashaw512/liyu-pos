-- Enable necessary security and key generation extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";



-- =======================================================================
-- LYU POS — ENTERPRISE STAFF INVITATION SYSTEM MIGRATION
-- =======================================================================

/* ─── 3. ROW LEVEL SECURITY (RLS) POLICIES ───────────────────────────────── */
ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;

-- Management access: Allows creators/managers to draft and audit their store invitations
CREATE POLICY "Allow management write access" 
ON public.staff_invitations 
FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.business_id = staff_invitations.business_id
          AND (profiles.role = 'owner' OR profiles.role = 'manager')
    )
);

-- Public / Anonymous check: Allows the invite verification code screen to check token status
CREATE POLICY "Allow public status verification" 
ON public.staff_invitations 
FOR SELECT 
TO anon, authenticated
USING (status = 'pending');

/* ─── 4. AUTOMATED HOOK FUNCTION TRIGGER ─────────────────────────────────── */




-- ============================================
-- 8. INVENTORY



-- ============================================
-- 13. SALES
-- ============================================
CREATE TABLE sales (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id),
  branch_id       UUID NOT NULL REFERENCES branches(id),
  shift_id        UUID REFERENCES shifts(id),
  cashier_id      UUID REFERENCES profiles(id),
  receipt_number  VARCHAR(50) NOT NULL,
  subtotal        NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  tax_amount      NUMERIC(10,2) DEFAULT 0.00,
  discount_amount NUMERIC(10,2) DEFAULT 0.00,
  total_amount    NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  status          VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('completed','voided','refunded','pending')),
  customer_name   VARCHAR(150),
  customer_phone  VARCHAR(20),
  notes           TEXT,
  is_offline_sync BOOLEAN DEFAULT FALSE,
  offline_id      VARCHAR(100),
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  voided_at       TIMESTAMP WITH TIME ZONE,
  voided_by       UUID REFERENCES profiles(id),
  deleted_at      TIMESTAMP WITH TIME ZONE,
  table_id        UUID REFERENCES restaurant_tables(id) ON DELETE SET NULL,
  table_name      VARCHAR(50), 
  tip_amount      NUMERIC(10,2) DEFAULT 0.00
);

CREATE UNIQUE INDEX idx_sales_receipt ON sales(business_id, receipt_number);



-- ============================================
-- 18. AUTOMATED TRIGGERS AND BUSINESS LOGIC
-- ============================================
CREATE TRIGGER trg_businesses_updated BEFORE UPDATE ON businesses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_onboarding_progress_updated BEFORE UPDATE ON onboarding_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_restaurant_tables_updated BEFORE UPDATE ON restaurant_tables FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION compute_discrepancy_value() RETURNS TRIGGER AS $$
BEGIN
  NEW.discrepancy_value = NEW.discrepancy_qty * (SELECT retail_price FROM products WHERE id = NEW.product_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_recon_discrepancy BEFORE INSERT OR UPDATE ON stock_reconciliations FOR EACH ROW EXECUTE FUNCTION compute_discrepancy_value();

CREATE OR REPLACE FUNCTION reduce_inventory_on_sale()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.inventory (business_id, branch_id, product_id, quantity, updated_at)
  SELECT 
    s.business_id,
    s.branch_id,
    NEW.product_id,
    -NEW.quantity,
    NOW()
  FROM public.sales s
  WHERE s.id = NEW.sale_id
  ON CONFLICT (branch_id, product_id)
  DO UPDATE SET
    quantity = inventory.quantity - NEW.quantity,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sale_item_inventory AFTER INSERT ON sale_items FOR EACH ROW EXECUTE FUNCTION reduce_inventory_on_sale();

INSERT INTO category_templates (business_type, name_en, name_am, sort_order) VALUES
('bar_restaurant', 'Beer', 'ቢራ', 1),
('bar_restaurant', 'Soft Drinks', 'ለስላሳ መጠጦች', 2),
('bar_restaurant', 'Food', 'ምግብ', 3),
('cafe_restaurant', 'Coffee & Tea', 'ቡና እና ሻይ', 1),
('cafe_restaurant', 'Bakery & Snacks', 'ኬክ እና መክሰስ', 2),
('bar_traditional', 'Traditional Drinks', 'የባህል መጠጦች', 1),
('retail_kiosk', 'Fast Moving Goods', 'የእለት ተእለት ፍጆታዎች', 1)
ON CONFLICT DO NOTHING;

-- ========================================================================
-- 18B. INTEROPERABILITY RECOVERY ENGINE (Dynamic Assign/Revoke Engine)
-- ========================================================================
CREATE OR REPLACE FUNCTION public.sync_profile_role_to_matrix()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS NOT NULL THEN
    INSERT INTO public.profile_roles (profile_id, role_name)
    VALUES (NEW.id, NEW.role)
    ON CONFLICT (profile_id, role_name) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_sync_profile_role_to_matrix
  AFTER INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_role_to_matrix();

-- ========================================================
-- 19. LIYU POS — SECURITY ARCHITECTURE (RLS POLICIES)
-- ========================================================

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_tables ENABLE ROW LEVEL SECURITY;


-- BUSINESSES POLICIES
CREATE POLICY "business_tenant_isolation_select" ON businesses FOR SELECT USING (id = auth_business_id());
CREATE POLICY "business_owner_modify" ON businesses FOR UPDATE USING (id = auth_business_id() AND auth_has_any_role(ARRAY['owner']));

-- BRANCHES POLICIES
CREATE POLICY "branches_tenant_isolation_select" ON branches FOR SELECT USING (business_id = auth_business_id());
CREATE POLICY "branches_owner_modify" ON branches FOR ALL USING (business_id = auth_business_id() AND auth_has_any_role(ARRAY['owner']));

-- PROFILES POLICIES
CREATE POLICY "profiles_secure_select" ON public.profiles
  FOR SELECT 
  TO authenticated
  USING (id = auth.uid() OR business_id = auth_business_id());

CREATE POLICY "profiles_secure_administrative" ON public.profiles
  FOR ALL
  TO authenticated
  USING (business_id = auth_business_id() AND auth_has_any_role(ARRAY['owner', 'manager']));

CREATE POLICY "profiles_self_update" ON profiles FOR UPDATE USING (id = auth.uid());

-- PROFILE ROLES MATRIX POLICIES (Protects dynamic grant/revoke processing boundaries)
CREATE POLICY "profile_roles_tenant_isolation_select" ON profile_roles 
  FOR SELECT USING (profile_id = auth.uid() OR (SELECT business_id FROM public.profiles WHERE id = profile_id) = auth_business_id());

CREATE POLICY "profile_roles_administrative_modify" ON profile_roles 
  FOR ALL USING ((SELECT business_id FROM public.profiles WHERE id = profile_id) = auth_business_id() AND auth_has_any_role(ARRAY['owner', 'manager']));

-- ONBOARDING PROGRESS POLICIES
CREATE POLICY "onboarding_progress_select" ON onboarding_progress FOR SELECT USING (business_id = auth_business_id());
CREATE POLICY "onboarding_progress_owner_all" ON onboarding_progress FOR ALL USING (business_id = auth_business_id() AND auth_has_any_role(ARRAY['owner']));

-- CATEGORY TEMPLATES POLICIES
CREATE POLICY "category_templates_read_all" ON category_templates FOR SELECT TO authenticated USING (true);

-- PRODUCTS POLICIES
CREATE POLICY "products_tenant_select" ON products FOR SELECT USING (business_id = auth_business_id());
CREATE POLICY "products_administrative_modify" ON products FOR ALL USING (business_id = auth_business_id() AND auth_has_any_role(ARRAY['owner','manager']));

-- CATEGORIES POLICIES
CREATE POLICY "categories_tenant_select" ON categories FOR SELECT USING (business_id = auth_business_id());
CREATE POLICY "categories_administrative_modify" ON categories FOR ALL USING (business_id = auth_business_id() AND auth_has_any_role(ARRAY['owner','manager']));

-- RESTAURANT TABLES POLICIES
CREATE POLICY "restaurant_tables_tenant_select" ON restaurant_tables FOR SELECT USING (business_id = auth_business_id());
CREATE POLICY "restaurant_tables_administrative_modify" ON restaurant_tables FOR ALL USING (business_id = auth_business_id() AND auth_has_any_role(ARRAY['owner', 'manager']));

-- SALES POLICIES
CREATE POLICY "sales_tenant_select" ON sales FOR SELECT USING (business_id = auth_business_id());
CREATE POLICY "sales_staff_insert" ON sales FOR INSERT WITH CHECK (business_id = auth_business_id() AND auth_has_any_role(ARRAY['owner','manager','cashier', 'waiter']));
CREATE POLICY "sales_administrative_void" ON sales FOR UPDATE USING (business_id = auth_business_id() AND auth_has_any_role(ARRAY['owner','manager']));

-- SALE ITEMS POLICIES
CREATE POLICY "sale_items_tenant_select" ON sale_items FOR SELECT USING ((SELECT business_id FROM public.sales WHERE id = sale_id) = auth_business_id());
CREATE POLICY "sale_items_staff_insert" ON sale_items FOR INSERT WITH CHECK ((SELECT business_id FROM public.sales WHERE id = sale_id) = auth_business_id() AND auth_has_any_role(ARRAY['owner','manager','cashier','waiter']));

-- PAYMENTS POLICIES
CREATE POLICY "payments_tenant_select" ON payments FOR SELECT USING (business_id = auth_business_id());
CREATE POLICY "payments_staff_insert" ON payments FOR INSERT WITH CHECK (business_id = auth_business_id() AND auth_has_any_role(ARRAY['owner','manager','cashier']));

-- SHIFTS POLICIES
CREATE POLICY "shifts_tenant_and_staff_select" ON shifts FOR SELECT USING (business_id = auth_business_id() AND (auth_has_any_role(ARRAY['owner','manager']) OR cashier_id = auth.uid()));
CREATE POLICY "shifts_staff_insert" ON shifts FOR INSERT WITH CHECK (business_id = auth_business_id() AND auth_has_any_role(ARRAY['owner','manager','cashier']));
CREATE POLICY "shifts_staff_update" ON shifts FOR UPDATE USING (business_id = auth_business_id() AND (auth_has_any_role(ARRAY['owner','manager']) OR cashier_id = auth.uid()));

-- EXPENSES POLICIES
CREATE POLICY "expenses_tenant_select" ON expenses FOR SELECT USING (business_id = auth_business_id());
CREATE POLICY "expenses_administrative_modify" ON expenses FOR ALL USING (business_id = auth_business_id() AND auth_has_any_role(ARRAY['owner','manager']));

-- STOCK RECONCILIATIONS POLICIES
CREATE POLICY "stock_reconciliations_tenant_select" ON stock_reconciliations FOR SELECT USING (business_id = auth_business_id());
CREATE POLICY "stock_reconciliations_administrative_modify" ON stock_reconciliations FOR ALL USING (business_id = auth_business_id() AND auth_has_any_role(ARRAY['owner','manager','inventory_clerk']));

-- INVENTORY POLICIES
CREATE POLICY "inventory_tenant_select" ON inventory FOR SELECT USING (business_id = auth_business_id());
CREATE POLICY "inventory_clerk_modify" ON inventory FOR UPDATE USING (business_id = auth_business_id() AND auth_has_any_role(ARRAY['owner','manager','inventory_clerk']));
CREATE POLICY "inventory_owner_initialize" ON inventory FOR INSERT WITH CHECK (business_id = auth_business_id() AND auth_has_any_role(ARRAY['owner']));
  
-- AUDIT LOGS POLICIES
CREATE POLICY "audit_logs_administrative_select" ON audit_logs FOR SELECT USING (business_id = auth_business_id() AND auth_has_any_role(ARRAY['owner','manager']));


