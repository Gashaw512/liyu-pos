-- ============================================================
-- 009_schema_audit.sql
-- Domain: System-wide Audit Logging/Operational Security Tracking
-- Dependencies: 003, 004
-- ============================================================

CREATE TABLE public.audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID REFERENCES public.businesses(id),
  user_id         UUID REFERENCES public.profiles(id),
  action          VARCHAR(100) NOT NULL,
  table_name      VARCHAR(80),
  record_id       UUID,
  old_values      JSONB,
  new_values      JSONB,
  ip_address      INET,
  user_agent      TEXT,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Note: Audit logs generally do not have "updated_at" because they 
-- are immutable (never changed after creation).