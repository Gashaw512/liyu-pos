-- Older app versions and concurrent devices may have created more than one
-- open row for the same cashier. Keep the newest row active (the same ordering
-- used by the app's open-shift lookup) and suspend older duplicates. This
-- retains their linked sales and shift history without inventing a cash count
-- or a close time for a shift that was never formally closed.
WITH ranked_open_shifts AS (
	SELECT
		id,
		ROW_NUMBER() OVER (
			PARTITION BY business_id, branch_id, cashier_id
			ORDER BY opened_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
		) AS position
	FROM public.shifts
	WHERE status = 'open'
)
UPDATE public.shifts AS shifts
SET
	status = 'suspended',
	notes = concat_ws(
		E'\n',
		nullif(shifts.notes, ''),
		'Automatically suspended during single-open-shift migration; a newer open shift exists for this cashier, branch, and business.'
	)
FROM ranked_open_shifts AS ranked
WHERE shifts.id = ranked.id
	AND ranked.position > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_shifts_one_open_per_cashier_branch
	ON public.shifts (business_id, branch_id, cashier_id)
	WHERE status = 'open';
