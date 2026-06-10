-- ============================================================================
-- 007_schema_sales.sql
-- Domain: Transaction Processing & POS Checkout Models
-- Dependencies: 004_schema_users.sql, 005_schema_catalog.sql
-- ============================================================================

-- CREATE TABLE public.restaurant_tables (
--   id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   business_id     UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
--   branch_id       UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
--   name            VARCHAR(50) NOT NULL,
--   capacity        INT DEFAULT 4,
--   is_active       BOOLEAN DEFAULT TRUE,
--   created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--   deleted_at      TIMESTAMP WITH TIME ZONE,
--   CONSTRAINT unique_branch_table_name UNIQUE(branch_id, name)
-- );

CREATE TABLE public.sales (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES public.businesses(id),
  branch_id       UUID NOT NULL REFERENCES public.branches(id),
  shift_id        UUID, -- Attached via Step 8 (Shifts) via Alterations if needed or left as UUID
  cashier_id      UUID REFERENCES public.profiles(id),
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
  voided_by       UUID REFERENCES public.profiles(id),
  deleted_at      TIMESTAMP WITH TIME ZONE,
  table_id        UUID REFERENCES public.restaurant_tables(id) ON DELETE SET NULL,
  table_name      VARCHAR(50), 
  tip_amount      NUMERIC(10,2) DEFAULT 0.00
);

CREATE UNIQUE INDEX idx_sales_receipt ON public.sales(business_id, receipt_number);

CREATE TABLE public.sale_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id         UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES public.products(id),
  product_name    VARCHAR(200) NOT NULL,
  unit_price      NUMERIC(10,2) NOT NULL,
  cost_price      NUMERIC(10,2) NOT NULL,
  quantity        NUMERIC(10,2) NOT NULL DEFAULT 1,
  discount        NUMERIC(10,2) DEFAULT 0.00,
  total_amount    NUMERIC(10,2) GENERATED ALWAYS AS ((unit_price - discount) * quantity) STORED,
  gross_profit    NUMERIC(10,2) GENERATED ALWAYS AS ((unit_price - cost_price - discount) * quantity) STORED,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id         UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  business_id     UUID NOT NULL REFERENCES public.businesses(id),
  method          VARCHAR(40) NOT NULL CHECK (method IN ('cash','telebirr','cbe_birr','coop_bank','awash_bank','dashen_bank','bank_transfer','credit')),
  amount          NUMERIC(10,2) NOT NULL,
  reference_no    VARCHAR(100),
  status          VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('completed','pending','failed','refunded')),
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);