DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM public.shifts
		WHERE status = 'open'
		GROUP BY business_id, branch_id, cashier_id
		HAVING COUNT(*) > 1
	) THEN
		RAISE EXCEPTION 'Cannot enforce one open shift per cashier and branch: duplicate open shifts already exist. Resolve those records before retrying this migration.';
	END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_shifts_one_open_per_cashier_branch
	ON public.shifts (business_id, branch_id, cashier_id)
	WHERE status = 'open';
