-- ============================================================
-- 005_schema_catalog.sql
-- Domain: Core POS Enterprise Retail Catalog Engine
-- Dependencies: 003_schema_business.sql, 002_base_functions.sql
-- ============================================================

-- ============================================
-- 1. CATEGORIES & CATEGORY TEMPLATES
-- ============================================
CREATE TABLE public.categories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name            VARCHAR(100) NOT NULL,
  name_am           VARCHAR(100), -- Localized Amharic Name
  group_type      VARCHAR(50),  -- e.g., 'Retail', 'Kitchen', 'Bar'
  icon            VARCHAR(50),
  color           VARCHAR(20),
  sort_order      INT DEFAULT 0,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at      TIMESTAMP WITH TIME ZONE
);

-- Indexing for multi-tenant scannability
CREATE INDEX idx_categories_business ON public.categories(business_id) WHERE deleted_at IS NULL;

-- Soft-delete aware unique constraint per tenant
CREATE UNIQUE INDEX uq_categories_active_name 
  ON public.categories(business_id, name) 
  WHERE deleted_at IS NULL;

CREATE TRIGGER trg_categories_updated
    BEFORE UPDATE ON public.categories
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();


CREATE TABLE public.category_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_type VARCHAR(50) NOT NULL, -- e.g., 'Boutique', 'Grocery', 'Restaurant'
  name_en       VARCHAR(100) NOT NULL,
  name_am       VARCHAR(100),
  sort_order    INT DEFAULT 0
);




-- ============================================
-- 1.5 PRICE GROUPS (BONO)
-- ============================================
CREATE TABLE public.price_groups (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name            VARCHAR(100) NOT NULL,
  name_am         VARCHAR(100), -- Localized "Bono" name
  amount          NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at      TIMESTAMP WITH TIME ZONE,
  CONSTRAINT positive_amount CHECK (amount >= 0)
);


CREATE INDEX idx_price_groups_business ON public.price_groups(business_id) WHERE deleted_at IS NULL;

-- Soft-delete aware unique constraint for Bono names per business
CREATE UNIQUE INDEX uq_price_groups_active_name 
  ON public.price_groups(business_id, name) 
  WHERE deleted_at IS NULL;

CREATE TRIGGER trg_price_groups_updated
    BEFORE UPDATE ON public.price_groups
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();


-- ============================================
-- 2. PRODUCTS
-- ============================================
CREATE TABLE public.products (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id         UUID REFERENCES public.branches(id), -- Null means global to the entire business
  category_id       UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  

   -- Bono Integration Fields
  price_group_id    UUID REFERENCES public.price_groups(id) ON DELETE SET NULL,
  price_type        VARCHAR(20) DEFAULT 'fixed' CHECK (price_type IN ('fixed', 'group')),

  name              VARCHAR(200) NOT NULL,
  name_am           VARCHAR(200), -- Amharic name for kitchen tickets/localized receipts
  description       TEXT,
  barcode           VARCHAR(100),
  sku               VARCHAR(100),
  unit_type         VARCHAR(30) DEFAULT 'piece' CHECK (unit_type IN ('piece','bottle','crate','kg','gram','liter','ml','pack')),
  units_per_crate   INT DEFAULT 1,
  
  
  cost_price        NUMERIC(12,2) NOT NULL DEFAULT 0.00, -- Expanded precision for high-volume transactions
  retail_price      NUMERIC(12,2) NOT NULL DEFAULT 0.00,
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

-- Critical query optimizations
CREATE INDEX idx_products_business ON public.products(business_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_category ON public.products(category_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_barcode ON public.products(barcode) WHERE barcode IS NOT NULL AND deleted_at IS NULL;

-- Multi-tenant unique guards (Ensures uniqueness inside the specific business context)
CREATE UNIQUE INDEX uq_products_active_sku 
  ON public.products(business_id, sku) 
  WHERE deleted_at IS NULL AND sku IS NOT NULL;

CREATE UNIQUE INDEX uq_products_active_barcode 
  ON public.products(business_id, barcode) 
  WHERE deleted_at IS NULL AND barcode IS NOT NULL;

CREATE TRIGGER trg_products_updated
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();


-- ============================================
-- 3. SUPPLIERS
-- ============================================
CREATE TABLE public.suppliers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name            VARCHAR(200) NOT NULL,
  phone           VARCHAR(20),
  email           VARCHAR(255),
  tin             VARCHAR(15), -- Added for Ethiopian tax/audit compliance tracking
  address         TEXT,
  notes           TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at      TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_suppliers_business ON public.suppliers(business_id) WHERE deleted_at IS NULL;

-- Ensure supplier names are distinct per business tenant
CREATE UNIQUE INDEX uq_suppliers_active_name 
  ON public.suppliers(business_id, name) 
  WHERE deleted_at IS NULL;

CREATE TRIGGER trg_suppliers_updated
    BEFORE UPDATE ON public.suppliers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();


-- ============================================
-- 4. RESTAURANT TABLES
-- ============================================
CREATE TABLE public.restaurant_tables (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id       UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  name            VARCHAR(50) NOT NULL,
  capacity        INT DEFAULT 4 CHECK (capacity > 0),
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at      TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_tables_branch ON public.restaurant_tables(branch_id) WHERE deleted_at IS NULL;

-- Soft-delete safe unique tables per branch
CREATE UNIQUE INDEX uq_tables_active_branch_name 
  ON public.restaurant_tables(branch_id, name) 
  WHERE deleted_at IS NULL;

CREATE TRIGGER trg_restaurant_tables_updated
    BEFORE UPDATE ON public.restaurant_tables
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();