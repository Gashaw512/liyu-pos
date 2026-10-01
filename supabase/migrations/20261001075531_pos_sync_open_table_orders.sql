CREATE TABLE public.open_table_orders (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
	branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
	table_id UUID NOT NULL REFERENCES public.restaurant_tables(id) ON DELETE CASCADE,
	cashier_id UUID NOT NULL REFERENCES public.profiles(id),
	items JSONB NOT NULL DEFAULT '[]'::JSONB
		CHECK (jsonb_typeof(items) = 'array'),
	total_amount NUMERIC(10,2) NOT NULL DEFAULT 0
		CHECK (total_amount >= 0),
	revision INTEGER NOT NULL DEFAULT 1
		CHECK (revision > 0),
	status VARCHAR(20) NOT NULL DEFAULT 'open'
		CHECK (status IN ('open', 'completed', 'cancelled')),
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_open_table_orders_active_table
	ON public.open_table_orders (branch_id, table_id)
	WHERE status = 'open';

CREATE INDEX idx_open_table_orders_branch_updated
	ON public.open_table_orders (business_id, branch_id, updated_at DESC)
	WHERE status = 'open';

CREATE TRIGGER trg_open_table_orders_updated
	BEFORE UPDATE ON public.open_table_orders
	FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.open_table_orders ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.open_table_orders FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.open_table_orders TO authenticated;

CREATE POLICY open_table_orders_select
	ON public.open_table_orders FOR SELECT TO authenticated
	USING (
		business_id = public.auth_business_id()
		AND branch_id = (
			SELECT branch_id FROM public.profiles
			WHERE id = (SELECT auth.uid()) AND deleted_at IS NULL
		)
	);

CREATE POLICY open_table_orders_insert
	ON public.open_table_orders FOR INSERT TO authenticated
	WITH CHECK (
		business_id = public.auth_business_id()
		AND branch_id = (
			SELECT branch_id FROM public.profiles
			WHERE id = (SELECT auth.uid()) AND deleted_at IS NULL
		)
		AND cashier_id = (SELECT auth.uid())
	);

CREATE POLICY open_table_orders_update
	ON public.open_table_orders FOR UPDATE TO authenticated
	USING (
		business_id = public.auth_business_id()
		AND branch_id = (
			SELECT branch_id FROM public.profiles
			WHERE id = (SELECT auth.uid()) AND deleted_at IS NULL
		)
	)
	WITH CHECK (
		business_id = public.auth_business_id()
		AND branch_id = (
			SELECT branch_id FROM public.profiles
			WHERE id = (SELECT auth.uid()) AND deleted_at IS NULL
		)
	);

CREATE POLICY open_table_orders_delete
	ON public.open_table_orders FOR DELETE TO authenticated
	USING (
		business_id = public.auth_business_id()
		AND branch_id = (
			SELECT branch_id FROM public.profiles
			WHERE id = (SELECT auth.uid()) AND deleted_at IS NULL
		)
	);
