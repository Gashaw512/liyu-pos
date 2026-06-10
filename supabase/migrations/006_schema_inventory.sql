-- ============================================================
-- 006_schema_inventory.sql
-- Domain: Core Realtime Inventory Control Ledger Architecture
-- Dependencies: 003_schema_business.sql, 004_schema_users.sql, 005_schema_catalog.sql
-- ============================================================

-- ============================================
-- 1. INVENTORY
-- ============================================
CREATE TABLE public.inventory (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id       UUID NOT NULL REFERENCES public.branches(id),
  product_id      UUID NOT NULL REFERENCES public.products(id),
  quantity        NUMERIC(10,2) NOT NULL DEFAULT 0,
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(branch_id, product_id)
);

CREATE TRIGGER trg_inventory_updated
    BEFORE UPDATE ON public.inventory
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- 2. INVENTORY MOVEMENTS
-- ============================================
CREATE TABLE public.inventory_movements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES public.businesses(id),
  branch_id       UUID NOT NULL REFERENCES public.branches(id),
  product_id      UUID NOT NULL REFERENCES public.products(id),
  user_id         UUID REFERENCES public.profiles(id),
  movement_type   VARCHAR(30) NOT NULL CHECK (movement_type IN ('sale','purchase','adjustment','transfer_in','transfer_out','waste','theft','return','opening')),
  quantity        NUMERIC(10,2) NOT NULL,
  unit_cost       NUMERIC(10,2),
  reference_id    UUID,
  reference_type  VARCHAR(30),
  notes           TEXT,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. PURCHASES
-- ============================================
CREATE TABLE public.purchases (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES public.businesses(id),
  branch_id       UUID NOT NULL REFERENCES public.branches(id),
  supplier_id     UUID REFERENCES public.suppliers(id),
  created_by      UUID REFERENCES public.profiles(id),
  reference_no    VARCHAR(100),
  total_amount    NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  paid_amount     NUMERIC(10,2) DEFAULT 0.00,
  status          VARCHAR(20) DEFAULT 'received' CHECK (status IN ('pending','received','partial')),
  notes           TEXT,
  purchased_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- Added for consistency
  deleted_at      TIMESTAMP WITH TIME ZONE
);

CREATE TRIGGER trg_purchases_updated
    BEFORE UPDATE ON public.purchases
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- 4. PURCHASE ITEMS
-- ============================================
CREATE TABLE public.purchase_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id     UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES public.products(id),
  quantity        NUMERIC(10,2) NOT NULL,
  unit_cost       NUMERIC(10,2) NOT NULL,
  total_cost      NUMERIC(10,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED
);