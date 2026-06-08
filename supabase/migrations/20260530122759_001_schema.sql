-- Enable necessary security and key generation extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- System-wide helper function to auto-update modification timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 1. BUSINESSES
-- ============================================
CREATE TABLE businesses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(200) NOT NULL,
  type            VARCHAR(50) NOT NULL CHECK (type IN ('bar_restaurant', 'cafe_restaurant', 'bar_traditional', 'retail_kiosk', 'service_hospitality', 'other')),
  phone           VARCHAR(20),
  email           VARCHAR(255),
  address         TEXT,
  city            VARCHAR(100) DEFAULT 'Addis Ababa',
  logo_url        TEXT,
  currency        VARCHAR(10) DEFAULT 'ETB',
  timezone        VARCHAR(50) DEFAULT 'Africa/Addis_Ababa',
  language        VARCHAR(10) DEFAULT 'am',
  tax_rate        NUMERIC(5,2) DEFAULT 0.00,
  open_time       TIME DEFAULT '06:00',
  close_time      TIME DEFAULT '23:00',
  is_active       BOOLEAN DEFAULT TRUE,
  plan            VARCHAR(20) DEFAULT 'starter' CHECK (plan IN ('starter','business','pro')),
  trial_ends_at   TIMESTAMP WITH TIME ZONE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at      TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_businesses_active ON businesses(is_active) WHERE deleted_at IS NULL;

-- ============================================
-- 2. BRANCHES
-- ============================================
CREATE TABLE branches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name            VARCHAR(200) NOT NULL,
  address         TEXT,
  phone           VARCHAR(20),
  is_main         BOOLEAN DEFAULT FALSE,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at      TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_branches_business ON branches(business_id) WHERE deleted_at IS NULL;

-- ============================================
-- 3. USERS (profiles table extending auth.users)
-- ============================================
CREATE TABLE profiles (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id           UUID REFERENCES businesses(id),
  branch_id             UUID REFERENCES branches(id),
  full_name             VARCHAR(150) NOT NULL,
  phone                 VARCHAR(20),
  pin_hash              TEXT,
  role                  VARCHAR(30) NOT NULL CHECK (role IN ('owner','manager','cashier','inventory_clerk')),
  language              VARCHAR(10) DEFAULT 'am',
  avatar_url            TEXT,
  onboarding_completed  BOOLEAN DEFAULT FALSE,
  onboarding_step       VARCHAR(50) DEFAULT 'welcome',
  is_active             BOOLEAN DEFAULT TRUE,
  last_seen_at          TIMESTAMP WITH TIME ZONE,
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at            TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_profiles_business ON profiles(business_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_profiles_role ON profiles(business_id, role);

-- ============================================
-- 4. ONBOARDING TRACKING STATE MACHINE
-- ============================================
CREATE TABLE onboarding_progress (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  current_step  VARCHAR(50) DEFAULT 'welcome',
  is_completed  BOOLEAN DEFAULT FALSE,
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 5. CATEGORIES & CATEGORY TEMPLATES
-- ============================================
CREATE TABLE categories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name            VARCHAR(100) NOT NULL,
  name_am         VARCHAR(100),
  group_type      VARCHAR(50),
  icon            VARCHAR(50),
  color           VARCHAR(20),
  sort_order      INT DEFAULT 0,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at      TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_categories_business ON categories(business_id) WHERE deleted_at IS NULL;

CREATE TABLE category_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_type VARCHAR(50),
  name_en       VARCHAR(100),
  name_am       VARCHAR(100),
  sort_order    INT DEFAULT 0
);

-- ============================================
-- 6. PRODUCTS
-- ============================================
CREATE TABLE products (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id         UUID REFERENCES branches(id),
  category_id       UUID REFERENCES categories(id),
  name              VARCHAR(200) NOT NULL,
  name_am           VARCHAR(200),
  barcode           VARCHAR(100),
  sku               VARCHAR(100),
  unit_type         VARCHAR(30) DEFAULT 'piece' CHECK (unit_type IN ('piece','bottle','crate','kg','gram','liter','ml','pack')),
  units_per_crate   INT DEFAULT 1,
  cost_price        NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  retail_price      NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  tax_inclusive     BOOLEAN DEFAULT TRUE,
  image_url         TEXT,
  is_active         BOOLEAN DEFAULT TRUE,
  is_sold_by_weight BOOLEAN DEFAULT FALSE,
  track_inventory   BOOLEAN DEFAULT TRUE,
  low_stock_alert   INT DEFAULT 5,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at        TIMESTAMP WITH TIME ZONE,
  CONSTRAINT positive_prices CHECK (cost_price >= 0 AND retail_price >= 0)
);

CREATE INDEX idx_products_business ON products(business_id) WHERE deleted_at IS NULL;

-- ============================================
-- 7. SUPPLIERS
-- ============================================
CREATE TABLE suppliers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name            VARCHAR(200) NOT NULL,
  phone           VARCHAR(20),
  email           VARCHAR(255),
  address         TEXT,
  notes           TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at      TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- 8. INVENTORY
-- ============================================
CREATE TABLE inventory (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id       UUID NOT NULL REFERENCES branches(id),
  product_id      UUID NOT NULL REFERENCES products(id),
  quantity        NUMERIC(10,2) NOT NULL DEFAULT 0,
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(branch_id, product_id)
);

-- ============================================
-- 9. SHIFTS
-- ============================================
CREATE TABLE shifts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id           UUID NOT NULL REFERENCES businesses(id),
  branch_id             UUID NOT NULL REFERENCES branches(id),
  cashier_id            UUID NOT NULL REFERENCES profiles(id),
  opened_by             UUID REFERENCES profiles(id),
  closed_by             UUID REFERENCES profiles(id),
  shift_label           VARCHAR(30) DEFAULT 'Morning' CHECK (shift_label IN ('Morning','Afternoon','Evening','Night','Full Day')),
  opened_at             TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  closed_at             TIMESTAMP WITH TIME ZONE,
  opening_cash          NUMERIC(10,2) DEFAULT 0.00,
  expected_cash         NUMERIC(10,2) DEFAULT 0.00,
  actual_cash_reported  NUMERIC(10,2),
  cash_discrepancy      NUMERIC(10,2) GENERATED ALWAYS AS (actual_cash_reported - expected_cash) STORED,
  total_sales           NUMERIC(10,2) DEFAULT 0.00,
  total_transactions    INT DEFAULT 0,
  status                VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open','closed','suspended')),
  is_first_shift        BOOLEAN DEFAULT FALSE,
  notes                 TEXT,
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  opening_float         NUMERIC(10,2) DEFAULT 0.00,
  closing_float         NUMERIC(10,2),
  actual_cash           NUMERIC(10,2),
  difference            NUMERIC(10,2)
);

-- ============================================
-- 10. STOCK RECONCILIATION
-- ============================================
CREATE TABLE stock_reconciliations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         UUID NOT NULL REFERENCES businesses(id),
  branch_id           UUID NOT NULL REFERENCES branches(id),
  shift_id            UUID REFERENCES shifts(id),
  product_id          UUID NOT NULL REFERENCES products(id),
  counted_by          UUID REFERENCES profiles(id),
  recon_date          DATE NOT NULL DEFAULT CURRENT_DATE,
  opening_qty         NUMERIC(10,2) NOT NULL DEFAULT 0,
  added_qty           NUMERIC(10,2) NOT NULL DEFAULT 0,
  closing_qty         NUMERIC(10,2) NOT NULL DEFAULT 0,
  logged_sales_qty    NUMERIC(10,2) NOT NULL DEFAULT 0,
  discrepancy_qty     NUMERIC(10,2) GENERATED ALWAYS AS ((opening_qty + added_qty - closing_qty) - logged_sales_qty) STORED,
  discrepancy_value   NUMERIC(10,2),
  notes               TEXT,
  is_verified         BOOLEAN DEFAULT FALSE,
  verified_by         UUID REFERENCES profiles(id),
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(branch_id, product_id, recon_date, shift_id)
);

-- ============================================
-- 11. INVENTORY MOVEMENTS
-- ============================================
CREATE TABLE inventory_movements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id),
  branch_id       UUID NOT NULL REFERENCES branches(id),
  product_id      UUID NOT NULL REFERENCES products(id),
  user_id         UUID REFERENCES profiles(id),
  movement_type   VARCHAR(30) NOT NULL CHECK (movement_type IN ('sale','purchase','adjustment','transfer_in','transfer_out','waste','theft','return','opening')),
  quantity        NUMERIC(10,2) NOT NULL,
  unit_cost       NUMERIC(10,2),
  reference_id    UUID,
  reference_type  VARCHAR(30),
  notes           TEXT,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 12. PURCHASES
-- ============================================
CREATE TABLE purchases (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id),
  branch_id       UUID NOT NULL REFERENCES branches(id),
  supplier_id     UUID REFERENCES suppliers(id),
  created_by      UUID REFERENCES profiles(id),
  reference_no    VARCHAR(100),
  total_amount    NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  paid_amount     NUMERIC(10,2) DEFAULT 0.00,
  status          VARCHAR(20) DEFAULT 'received' CHECK (status IN ('pending','received','partial')),
  notes           TEXT,
  purchased_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at      TIMESTAMP WITH TIME ZONE
);

CREATE TABLE purchase_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id     UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id),
  quantity        NUMERIC(10,2) NOT NULL,
  unit_cost       NUMERIC(10,2) NOT NULL,
  total_cost      NUMERIC(10,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED
);

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
  deleted_at      TIMESTAMP WITH TIME ZONE
);

CREATE UNIQUE INDEX idx_sales_receipt ON sales(business_id, receipt_number);

-- ============================================
-- 14. SALE ITEMS
-- ============================================
CREATE TABLE sale_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id         UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id),
  product_name    VARCHAR(200) NOT NULL,
  unit_price      NUMERIC(10,2) NOT NULL,
  cost_price      NUMERIC(10,2) NOT NULL,
  quantity        NUMERIC(10,2) NOT NULL DEFAULT 1,
  discount        NUMERIC(10,2) DEFAULT 0.00,
  total_amount    NUMERIC(10,2) GENERATED ALWAYS AS ((unit_price - discount) * quantity) STORED,
  gross_profit    NUMERIC(10,2) GENERATED ALWAYS AS ((unit_price - cost_price - discount) * quantity) STORED,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 15. PAYMENTS
-- ============================================
CREATE TABLE payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id         UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  business_id     UUID NOT NULL REFERENCES businesses(id),
  method          VARCHAR(40) NOT NULL CHECK (method IN ('cash','telebirr','cbe_birr','coop_bank','awash_bank','dashen_bank','bank_transfer','credit')),
  amount          NUMERIC(10,2) NOT NULL,
  reference_no    VARCHAR(100),
  status          VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('completed','pending','failed','refunded')),
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 16. EXPENSES
-- ============================================
CREATE TABLE expenses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id),
  branch_id       UUID REFERENCES branches(id),
  recorded_by     UUID REFERENCES profiles(id),
  shift_id        UUID REFERENCES shifts(id),
  category        VARCHAR(80) NOT NULL,
  description     TEXT,
  amount          NUMERIC(10,2) NOT NULL,
  payment_method  VARCHAR(40) DEFAULT 'cash',
  receipt_url     TEXT,
  expense_date    DATE DEFAULT CURRENT_DATE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at      TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- 17. AUDIT LOGS
-- ============================================
CREATE TABLE audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID REFERENCES businesses(id),
  user_id         UUID REFERENCES profiles(id),
  action          VARCHAR(100) NOT NULL,
  table_name      VARCHAR(80),
  record_id       UUID,
  old_values      JSONB,
  new_values      JSONB,
  ip_address      INET,
  user_agent      TEXT,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 18. AUTOMATED TRIGGERS AND BUSINESS LOGIC
-- ============================================
CREATE TRIGGER trg_businesses_updated BEFORE UPDATE ON businesses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_onboarding_progress_updated BEFORE UPDATE ON onboarding_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at();

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
('retail_kiosk', 'Fast Moving Goods', 'የእለት ተእለት ፍጆታዎች', 1);


-- ========================================================
-- 19. LIYU POS — SECURITY ARCHITECTURE (RLS POLICIES)
-- ========================================================

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
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

CREATE OR REPLACE FUNCTION auth_business_id()
RETURNS UUID AS $$
  SELECT business_id FROM public.profiles
  WHERE id = auth.uid() AND deleted_at IS NULL
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

CREATE OR REPLACE FUNCTION auth_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles
  WHERE id = auth.uid() AND deleted_at IS NULL
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

-- BUSINESSES POLICIES
CREATE POLICY "business_tenant_isolation_select" ON businesses FOR SELECT USING (id = auth_business_id());
CREATE POLICY "business_owner_modify" ON businesses FOR UPDATE USING (id = auth_business_id() AND auth_role() = 'owner');

-- BRANCHES POLICIES
CREATE POLICY "branches_tenant_isolation_select" ON branches FOR SELECT USING (business_id = auth_business_id());
CREATE POLICY "branches_owner_modify" ON branches FOR ALL USING (business_id = auth_business_id() AND auth_role() = 'owner');

-- PROFILES POLICIES
CREATE POLICY "profiles_secure_select" ON public.profiles
  FOR SELECT 
  TO authenticated
  USING (id = auth.uid() OR business_id = auth_business_id());

CREATE POLICY "profiles_secure_administrative" ON public.profiles
  FOR ALL
  TO authenticated
  USING (business_id = auth_business_id() AND auth_role() IN ('owner', 'manager'));

CREATE POLICY "profiles_self_update" ON profiles FOR UPDATE USING (id = auth.uid());

-- ONBOARDING PROGRESS POLICIES
CREATE POLICY "onboarding_progress_select" ON onboarding_progress FOR SELECT USING (business_id = auth_business_id());
CREATE POLICY "onboarding_progress_owner_all" ON onboarding_progress FOR ALL USING (business_id = auth_business_id() AND auth_role() = 'owner');

-- CATEGORY TEMPLATES POLICIES
CREATE POLICY "category_templates_read_all" ON category_templates FOR SELECT TO authenticated USING (true);

-- PRODUCTS POLICIES
CREATE POLICY "products_tenant_select" ON products FOR SELECT USING (business_id = auth_business_id());
CREATE POLICY "products_administrative_modify" ON products FOR ALL USING (business_id = auth_business_id() AND auth_role() IN ('owner','manager'));

-- CATEGORIES POLICIES
CREATE POLICY "categories_tenant_select" ON categories FOR SELECT USING (business_id = auth_business_id());
CREATE POLICY "categories_administrative_modify" ON categories FOR ALL USING (business_id = auth_business_id() AND auth_role() IN ('owner','manager'));

-- SALES POLICIES
CREATE POLICY "sales_tenant_select" ON sales FOR SELECT USING (business_id = auth_business_id());
CREATE POLICY "sales_staff_insert" ON sales FOR INSERT WITH CHECK (business_id = auth_business_id() AND auth_role() IN ('owner','manager','cashier'));
CREATE POLICY "sales_administrative_void" ON sales FOR UPDATE USING (business_id = auth_business_id() AND auth_role() IN ('owner','manager'));

-- SHIFTS POLICIES
CREATE POLICY "shifts_tenant_and_staff_select" ON shifts FOR SELECT USING (business_id = auth_business_id() AND (auth_role() IN ('owner','manager') OR cashier_id = auth.uid()));
CREATE POLICY "shifts_staff_insert" ON shifts FOR INSERT WITH CHECK (business_id = auth_business_id() AND auth_role() IN ('owner','manager','cashier'));
CREATE POLICY "shifts_staff_update" ON shifts FOR UPDATE USING (business_id = auth_business_id() AND (auth_role() IN ('owner','manager') OR cashier_id = auth.uid()));

-- INVENTORY POLICIES
CREATE POLICY "inventory_tenant_select" ON inventory FOR SELECT USING (business_id = auth_business_id());
CREATE POLICY "inventory_clerk_modify" ON inventory FOR UPDATE USING (business_id = auth_business_id() AND auth_role() IN ('owner','manager','inventory_clerk'));

CREATE POLICY "inventory_owner_initialize" ON inventory 
  FOR INSERT 
  WITH CHECK (business_id = auth_business_id() AND auth_role() = 'owner');
  
-- AUDIT LOGS POLICIES
CREATE POLICY "audit_logs_administrative_select" ON audit_logs FOR SELECT USING (business_id = auth_business_id() AND auth_role() IN ('owner','manager'));


-- ========================================================
-- 20. BACKEND PROVISIONING PIPELINE AUTOMATION
-- ========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user_registration()
RETURNS TRIGGER AS $$
DECLARE
  new_business_id UUID;
  new_branch_id   UUID;
  biz_name        TEXT;
  biz_type        TEXT;
  full_name_val   TEXT;
BEGIN
  biz_name      := COALESCE(NEW.raw_user_meta_data->>'business_name', 'My Store');
  biz_type      := COALESCE(NEW.raw_user_meta_data->>'business_type', 'other');
  full_name_val := COALESCE(NEW.raw_user_meta_data->>'full_name', 'Owner');

  INSERT INTO public.businesses (name, type, phone, plan, currency)
  VALUES (biz_name, biz_type, NEW.phone, 'starter', 'ETB')
  RETURNING id INTO new_business_id;

  INSERT INTO public.branches (business_id, name, phone, is_main, is_active)
  VALUES (new_business_id, 'ዋና ቅርንጫፍ (Main Branch)', NEW.phone, TRUE, TRUE)
  RETURNING id INTO new_branch_id;

  INSERT INTO public.profiles (id, business_id, branch_id, full_name, phone, role, language, onboarding_completed, onboarding_step, is_active)
  VALUES (NEW.id, new_business_id, new_branch_id, full_name_val, NEW.phone, 'owner', 'am', FALSE, 'welcome', TRUE);

  INSERT INTO public.onboarding_progress (business_id, current_step, is_completed)
  VALUES (new_business_id, 'welcome', FALSE);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_registration();