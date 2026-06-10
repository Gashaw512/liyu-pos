-- ============================================================
-- 008_schema_operations.sql
-- Domain: Daily Operations, Shifts, Expenses, and Reconciliation
-- Dependencies: 003, 004, 005, 006, 007
-- ============================================================

-- ============================================
-- 1. SHIFTS
-- ============================================
CREATE TABLE public.shifts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id           UUID NOT NULL REFERENCES public.businesses(id),
  branch_id             UUID NOT NULL REFERENCES public.branches(id),
  cashier_id            UUID NOT NULL REFERENCES public.profiles(id),
  opened_by             UUID REFERENCES public.profiles(id),
  closed_by             UUID REFERENCES public.profiles(id),
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
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  opening_float         NUMERIC(10,2) DEFAULT 0.00,
  closing_float         NUMERIC(10,2),
  actual_cash           NUMERIC(10,2),
  difference            NUMERIC(10,2)
);

-- Shift Timestamp Trigger
CREATE TRIGGER trg_shifts_updated
    BEFORE UPDATE ON public.shifts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- Link Sales to Shifts now that Shift table exists
ALTER TABLE public.sales 
ADD CONSTRAINT fk_sales_shift 
FOREIGN KEY (shift_id) REFERENCES public.shifts(id);

-- ============================================
-- 2. EXPENSES
-- ============================================
CREATE TABLE public.expenses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES public.businesses(id),
  branch_id       UUID REFERENCES public.branches(id),
  recorded_by     UUID REFERENCES public.profiles(id),
  shift_id        UUID REFERENCES public.shifts(id),
  category        VARCHAR(80) NOT NULL,
  description     TEXT,
  amount          NUMERIC(10,2) NOT NULL,
  payment_method  VARCHAR(40) DEFAULT 'cash',
  receipt_url     TEXT,
  expense_date    DATE DEFAULT CURRENT_DATE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at      TIMESTAMP WITH TIME ZONE
);

CREATE TRIGGER trg_expenses_updated
    BEFORE UPDATE ON public.expenses
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- 3. STOCK RECONCILIATION (Moved from 006)
-- ============================================
CREATE TABLE public.stock_reconciliations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         UUID NOT NULL REFERENCES public.businesses(id),
  branch_id           UUID NOT NULL REFERENCES public.branches(id),
  shift_id            UUID REFERENCES public.shifts(id),
  product_id          UUID NOT NULL REFERENCES public.products(id),
  counted_by          UUID REFERENCES public.profiles(id),
  recon_date          DATE NOT NULL DEFAULT CURRENT_DATE,
  opening_qty         NUMERIC(10,2) NOT NULL DEFAULT 0,
  added_qty           NUMERIC(10,2) NOT NULL DEFAULT 0,
  closing_qty         NUMERIC(10,2) NOT NULL DEFAULT 0,
  logged_sales_qty    NUMERIC(10,2) NOT NULL DEFAULT 0,
  discrepancy_qty     NUMERIC(10,2) GENERATED ALWAYS AS ((opening_qty + added_qty - closing_qty) - logged_sales_qty) STORED,
  discrepancy_value   NUMERIC(10,2),
  notes               TEXT,
  is_verified         BOOLEAN DEFAULT FALSE,
  verified_by         UUID REFERENCES public.profiles(id),
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(branch_id, product_id, recon_date, shift_id)
);