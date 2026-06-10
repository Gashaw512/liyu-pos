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
  name_am         VARCHAR(100),
  group_type      VARCHAR(50),
  icon            VARCHAR(50),
  color           VARCHAR(20),
  sort_order      INT DEFAULT 0,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- Added for consistency
  deleted_at      TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_categories_business ON public.categories(business_id) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_categories_updated
    BEFORE UPDATE ON public.categories
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.category_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_type VARCHAR(50),
  name_en       VARCHAR(100),
  name_am       VARCHAR(100),
  sort_order    INT DEFAULT 0
);

-- ============================================
-- 2. PRODUCTS
-- ============================================
CREATE TABLE public.products (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id         UUID REFERENCES public.branches(id),
  category_id       UUID REFERENCES public.categories(id),
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

CREATE INDEX idx_products_business ON public.products(business_id) WHERE deleted_at IS NULL;

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
  address         TEXT,
  notes           TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- Added for consistency
  deleted_at      TIMESTAMP WITH TIME ZONE
);

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
  capacity        INT DEFAULT 4,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- Added for consistency
  deleted_at      TIMESTAMP WITH TIME ZONE,
  CONSTRAINT unique_branch_table_name UNIQUE(branch_id, name)
);

CREATE TRIGGER trg_restaurant_tables_updated
    BEFORE UPDATE ON public.restaurant_tables
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();