
CREATE TABLE restaurant_tables (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name            VARCHAR(50) NOT NULL, -- e.g., 'Table 1', 'VIP Box', 'Bar Spot 3'
  capacity        INT DEFAULT 4,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at      TIMESTAMP WITH TIME ZONE,

  CONSTRAINT unique_branch_table_name UNIQUE(branch_id, name)
);

CREATE INDEX idx_tables_business ON restaurant_tables(business_id) WHERE deleted_at IS NULL;

-- ============================================
-- B. SCHEMA ALTERATIONS FOR ORDER TRACKING & TIPS
-- ============================================

-- 1. Track which table placed the sale, and log tips cleanly for payout calculations
ALTER TABLE sales 
  ADD COLUMN table_id     UUID REFERENCES restaurant_tables(id) ON DELETE SET NULL,
  ADD COLUMN table_name   VARCHAR(50), -- Snapshot text in case table configuration changes later
  ADD COLUMN tip_amount   NUMERIC(10,2) DEFAULT 0.00;

-- 2. Expand role validation to include 'waiter' so they can log into the POS screen safely
ALTER TABLE profiles 
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles 
  ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('owner', 'manager', 'cashier', 'inventory_clerk', 'waiter'));
  

-- ============================================
-- C. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================
ALTER TABLE restaurant_tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tables_tenant_isolation_select" 
  ON restaurant_tables FOR SELECT 
  USING (business_id = auth_business_id());

CREATE POLICY "tables_administrative_modify" 
  ON restaurant_tables FOR ALL 
  USING (business_id = auth_business_id() AND auth_role() IN ('owner', 'manager'));

-- Update sales policy so waiters can insert orders as well
DROP POLICY IF EXISTS "sales_staff_insert" ON sales;
CREATE POLICY "sales_staff_insert" 
  ON sales FOR INSERT 
  WITH CHECK (business_id = auth_business_id() AND auth_role() IN ('owner', 'manager', 'cashier', 'waiter'));