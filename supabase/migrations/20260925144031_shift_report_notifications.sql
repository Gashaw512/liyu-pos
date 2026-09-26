-- Server-only provider credentials and idempotent shift notification state.
CREATE TABLE public.business_notification_settings (
  business_id UUID PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
  telegram_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  telegram_bot_token_encrypted TEXT,
  telegram_chat_id TEXT,
  whatsapp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  updated_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT telegram_settings_complete CHECK (
    NOT telegram_enabled OR (telegram_bot_token_encrypted IS NOT NULL AND telegram_chat_id IS NOT NULL)
  ),
  CONSTRAINT whatsapp_not_supported CHECK (NOT whatsapp_enabled)
);

ALTER TABLE public.business_notification_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners and managers manage notification settings"
  ON public.business_notification_settings FOR ALL
  TO authenticated
  USING (business_id = public.auth_business_id() AND public.auth_has_any_role(ARRAY['owner','manager']))
  WITH CHECK (business_id = public.auth_business_id() AND public.auth_has_any_role(ARRAY['owner','manager']));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_notification_settings TO authenticated;

CREATE TABLE public.shift_report_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  shift_report_id UUID NOT NULL,
  branch_id UUID NOT NULL REFERENCES public.branches(id),
  cashier_id UUID NOT NULL REFERENCES public.profiles(id),
  opened_at TIMESTAMPTZ NOT NULL,
  closed_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sending','sent','failed','disabled')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, shift_report_id)
);
ALTER TABLE public.shift_report_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners and managers read shift report deliveries"
  ON public.shift_report_deliveries FOR SELECT
  TO authenticated
  USING (business_id = public.auth_business_id() AND public.auth_has_any_role(ARRAY['owner','manager']));
GRANT SELECT ON public.shift_report_deliveries TO authenticated;
CREATE INDEX idx_shift_report_deliveries_retry ON public.shift_report_deliveries(status, updated_at)
  WHERE status IN ('pending','failed');
CREATE UNIQUE INDEX idx_shift_report_deliveries_one_close_per_shift
  ON public.shift_report_deliveries(business_id, cashier_id, opened_at);
