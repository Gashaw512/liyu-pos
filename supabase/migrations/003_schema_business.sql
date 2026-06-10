-- ============================================================
-- 003_schema_business.sql
-- Domain: Core Business Structure/ Multi-Tenant Root Infrastructure
-- Dependencies: 001_extensions.sql, 002_base_functions.sql
-- ============================================================

-- ============================================
-- 1. BUSINESSES
-- ============================================
CREATE TABLE public.businesses (
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

CREATE INDEX idx_businesses_active ON public.businesses(is_active) WHERE deleted_at IS NULL;

-- Business Timestamp Trigger
CREATE TRIGGER trg_businesses_updated
    BEFORE UPDATE ON public.businesses
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();


-- ============================================
-- 2. BRANCHES
-- ============================================
CREATE TABLE public.branches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name            VARCHAR(200) NOT NULL,
  address         TEXT,
  phone           VARCHAR(20),
  is_main         BOOLEAN DEFAULT FALSE,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- Added for consistency
  deleted_at      TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_branches_business ON public.branches(business_id) WHERE deleted_at IS NULL;

-- Branch Timestamp Trigger
CREATE TRIGGER trg_branches_updated
    BEFORE UPDATE ON public.branches
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();


-- =========================================================
-- 3. ONBOARDING PROGRESS
-- =========================================================
CREATE TABLE public.onboarding_progress (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  current_step  VARCHAR(50) DEFAULT 'welcome',
  is_completed  BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Onboarding Timestamp Trigger
CREATE TRIGGER trg_onboarding_progress_updated
    BEFORE UPDATE ON public.onboarding_progress
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();