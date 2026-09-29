CREATE TABLE public.password_recovery_codes (
	user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
	code_hash TEXT NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	expires_at TIMESTAMPTZ NOT NULL,
	consumed_at TIMESTAMPTZ
);

CREATE INDEX idx_password_recovery_codes_expiry
	ON public.password_recovery_codes(expires_at);

ALTER TABLE public.password_recovery_codes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.password_recovery_codes
	FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
	ON TABLE public.password_recovery_codes
	TO service_role;
