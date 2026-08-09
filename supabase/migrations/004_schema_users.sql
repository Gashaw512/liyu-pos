-- ============================================================
-- 004_schema_users.sql
-- Domain: User Lifecycle & Identification Matrix
-- Dependencies: 003_schema_business.sql, 002_base_functions.sql
-- ============================================================

-- =========================================================
-- 1. PROFILES
-- =========================================================
CREATE TABLE public.profiles (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id           UUID REFERENCES public.businesses(id),
  branch_id             UUID REFERENCES public.branches(id),
  full_name             VARCHAR(150) NOT NULL,
  phone                 VARCHAR(20),
  pin_hash              TEXT,
  role                  VARCHAR(30),
  language              VARCHAR(10) DEFAULT 'am',
  avatar_url            TEXT,
  onboarding_completed  BOOLEAN DEFAULT FALSE,
  onboarding_step       VARCHAR(50) DEFAULT 'welcome',
  is_active             BOOLEAN DEFAULT TRUE,
  last_seen_at          TIMESTAMP WITH TIME ZONE,
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at            TIMESTAMP WITH TIME ZONE,
  CONSTRAINT profiles_role_check CHECK (
    role IN ('owner', 'manager', 'cashier', 'inventory_clerk', 'waiter', 'barman', 'kitchen')
  )
);

CREATE INDEX idx_profiles_business ON public.profiles(business_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_profiles_role ON public.profiles(business_id, role);

-- Profiles Timestamp Trigger Auto-update Automation
CREATE TRIGGER trg_profiles_updated
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- =========================================================
-- 2. PROFILE ROLES
-- =========================================================
CREATE TABLE public.profile_roles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_name     VARCHAR(30) NOT NULL,
  assigned_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT profile_roles_role_check CHECK (
    role_name IN ('owner', 'manager', 'cashier', 'inventory_clerk', 'waiter', 'barman', 'kitchen')
  ),
  CONSTRAINT unique_profile_role_assignment UNIQUE (profile_id, role_name)
);

CREATE INDEX idx_profile_roles_lookup ON public.profile_roles(profile_id);

-- =========================================================
-- 3. STAFF INVITATIONS
-- =========================================================
CREATE TABLE public.staff_invitations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id           UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  code                  TEXT NOT NULL UNIQUE,
  staff_name            TEXT NOT NULL,
  role_assigned         TEXT NOT NULL,
  phone                 TEXT,
  status                TEXT NOT NULL DEFAULT 'pending',
  created_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at            TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  used_at               TIMESTAMP WITH TIME ZONE,
  claimed_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT staff_invitation_status_check CHECK (status IN ('pending', 'used','expired'))

);


CREATE INDEX idx_staff_invitations_code
ON public.staff_invitations(code)
WHERE status = 'pending';

CREATE INDEX idx_staff_invitations_business
ON public.staff_invitations(business_id);

CREATE INDEX idx_staff_invitations_expires
ON public.staff_invitations(expires_at);