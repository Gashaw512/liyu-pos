-- One application bot; each tenant manages its own recipient list.
CREATE TABLE public.business_notification_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Owner',
  chat_id TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, chat_id),
  UNIQUE (business_id, id)
);

ALTER TABLE public.business_notification_recipients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners and managers manage business Telegram recipients"
  ON public.business_notification_recipients FOR ALL
  TO authenticated
  USING (business_id = public.auth_business_id() AND public.auth_has_any_role(ARRAY['owner','manager']))
  WITH CHECK (business_id = public.auth_business_id() AND public.auth_has_any_role(ARRAY['owner','manager']));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_notification_recipients TO authenticated;
REVOKE ALL ON public.business_notification_recipients FROM anon;
REVOKE ALL ON public.business_notification_settings FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_notification_settings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_notification_recipients TO service_role;

-- Preserve any existing single chat as this tenant's first recipient.
INSERT INTO public.business_notification_recipients (business_id, label, chat_id, enabled)
SELECT business_id, 'Owner', telegram_chat_id, telegram_enabled
FROM public.business_notification_settings
WHERE telegram_chat_id IS NOT NULL AND btrim(telegram_chat_id) <> ''
ON CONFLICT (business_id, chat_id) DO NOTHING;

ALTER TABLE public.business_notification_settings
  DROP CONSTRAINT IF EXISTS telegram_settings_complete,
  DROP COLUMN telegram_bot_token_encrypted,
  DROP COLUMN telegram_chat_id;

-- Delivery state is tracked per recipient, so retrying a partial failure never
-- re-sends a PDF to a recipient who already received it.
CREATE TABLE public.shift_report_recipient_deliveries (
  business_id UUID NOT NULL,
  shift_report_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sending','sent','failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  sent_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (business_id, shift_report_id, recipient_id),
  FOREIGN KEY (business_id, shift_report_id)
    REFERENCES public.shift_report_deliveries(business_id, shift_report_id) ON DELETE CASCADE,
  FOREIGN KEY (business_id, recipient_id)
    REFERENCES public.business_notification_recipients(business_id, id) ON DELETE CASCADE
);
ALTER TABLE public.shift_report_recipient_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners and managers read recipient delivery status"
  ON public.shift_report_recipient_deliveries FOR SELECT
  TO authenticated
  USING (business_id = public.auth_business_id() AND public.auth_has_any_role(ARRAY['owner','manager']));
GRANT SELECT ON public.shift_report_recipient_deliveries TO authenticated;
REVOKE ALL ON public.shift_report_recipient_deliveries FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.shift_report_deliveries TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.shift_report_recipient_deliveries TO service_role;
CREATE INDEX idx_shift_recipient_delivery_retry
  ON public.shift_report_recipient_deliveries(status, updated_at)
  WHERE status IN ('pending','failed');
