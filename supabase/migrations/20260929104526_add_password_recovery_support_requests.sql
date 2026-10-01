CREATE TABLE public.password_recovery_support_requests (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	contact_name VARCHAR(150) NOT NULL,
	business_name VARCHAR(200) NOT NULL,
	phone_e164 VARCHAR(20) NOT NULL,
	details TEXT NOT NULL,
	requester_ip_hash TEXT NOT NULL,
	status VARCHAR(20) NOT NULL DEFAULT 'pending'
		CHECK (status IN ('pending', 'reviewing', 'code_issued', 'closed')),
	support_agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
	support_notes TEXT,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	code_issued_at TIMESTAMPTZ
);

CREATE INDEX idx_password_recovery_support_queue
	ON public.password_recovery_support_requests(status, created_at DESC);

CREATE INDEX idx_password_recovery_support_ip
	ON public.password_recovery_support_requests(requester_ip_hash, created_at DESC);

ALTER TABLE public.password_recovery_support_requests ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.password_recovery_support_requests
	FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
	ON TABLE public.password_recovery_support_requests
	TO service_role;
