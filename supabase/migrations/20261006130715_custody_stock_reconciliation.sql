ALTER TABLE public.custody_shift_reconciliations
  ADD COLUMN status text NOT NULL DEFAULT 'not_submitted'
    CHECK (status IN ('not_submitted', 'submitted')),
  ADD COLUMN request_id uuid UNIQUE,
  ADD COLUMN submitted_lines jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN reconciled_by uuid REFERENCES public.profiles(id),
  ADD COLUMN reconciled_at timestamptz;

CREATE INDEX custody_reconciliations_business_branch_status_idx
  ON public.custody_shift_reconciliations (business_id, branch_id, status, closed_at DESC);

CREATE OR REPLACE FUNCTION public.submit_custody_stock_reconciliation(
  p_request_id uuid,
  p_business_id uuid,
  p_branch_id uuid,
  p_actor_id uuid,
  p_lines jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_shift public.custody_shifts%ROWTYPE;
  v_existing public.custody_shift_reconciliations%ROWTYPE;
  v_normalized jsonb;
  v_report_lines jsonb;
  v_physical_snapshot jsonb;
  v_now timestamptz := now();
  v_count integer;
  v_distinct_count integer;
BEGIN
  IF p_request_id IS NULL OR jsonb_typeof(p_lines) <> 'array' THEN
    RAISE EXCEPTION 'Submit a stock count for every product in your custody.';
  END IF;
  IF jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION 'Submit a stock count for every product in your custody.';
  END IF;

  -- Normalize client input once. The issued quantities and product names are
  -- never trusted from the client; both are loaded below from custody records.
  SELECT jsonb_agg(jsonb_build_object(
    'product_id', line.product_id,
    'used_quantity', line.used_quantity,
    'returned_quantity', line.returned_quantity,
    'wasted_quantity', line.wasted_quantity,
    'physical_count', line.physical_count
  ) ORDER BY line.product_id), count(*), count(DISTINCT line.product_id)
  INTO v_normalized, v_count, v_distinct_count
  FROM jsonb_to_recordset(p_lines) AS line(
    product_id uuid,
    used_quantity numeric,
    returned_quantity numeric,
    wasted_quantity numeric,
    physical_count numeric
  );

  IF v_count = 0 OR v_count <> v_distinct_count THEN
    RAISE EXCEPTION 'Each product must appear exactly once.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_to_recordset(v_normalized) AS line(
      product_id uuid, used_quantity numeric, returned_quantity numeric,
      wasted_quantity numeric, physical_count numeric
    )
    WHERE line.used_quantity IS NULL OR line.returned_quantity IS NULL
      OR line.wasted_quantity IS NULL OR line.physical_count IS NULL
      OR line.used_quantity < 0 OR line.returned_quantity < 0
      OR line.wasted_quantity < 0 OR line.physical_count < 0
  ) THEN
    RAISE EXCEPTION 'Stock quantities must be zero or greater.';
  END IF;

  -- A network retry with the same token returns the saved result. Reusing the
  -- token for a different payload is rejected rather than silently changing it.
  SELECT * INTO v_existing
  FROM public.custody_shift_reconciliations
  WHERE business_id = p_business_id AND request_id = p_request_id;
  IF FOUND THEN
    IF v_existing.branch_id <> p_branch_id
      OR v_existing.reconciled_by <> p_actor_id
      OR v_existing.submitted_lines <> v_normalized THEN
      RAISE EXCEPTION 'This reconciliation request ID was already used.';
    END IF;
    RETURN jsonb_build_object(
      'custody_shift_id', v_existing.custody_shift_id,
      'status', v_existing.status,
      'lines', v_existing.accepted_stock_snapshot,
      'physical_counts', v_existing.physical_count_snapshot,
      'reconciled_at', v_existing.reconciled_at
    );
  END IF;

  -- Normally reconcile an active custody window. If a manager already closed
  -- the business shift, allow a late count only for its explicit pending row.
  SELECT * INTO v_shift
  FROM public.custody_shifts
  WHERE business_id = p_business_id AND branch_id = p_branch_id
    AND user_id = p_actor_id AND status = 'ACTIVE'
  ORDER BY opened_at DESC
  LIMIT 1
  FOR UPDATE;
  IF NOT FOUND THEN
    SELECT cs.* INTO v_shift
    FROM public.custody_shifts cs
    JOIN public.custody_shift_reconciliations csr
      ON csr.custody_shift_id = cs.id
    WHERE cs.business_id = p_business_id AND cs.branch_id = p_branch_id
      AND cs.user_id = p_actor_id AND cs.status = 'CLOSED'
      AND cs.close_reason = 'branch_report_close'
      AND csr.status = 'not_submitted'
    ORDER BY cs.closed_at DESC
    LIMIT 1
    FOR UPDATE OF cs;
  END IF;
  IF NOT FOUND THEN
    SELECT csr.* INTO v_existing
    FROM public.custody_shift_reconciliations csr
    JOIN public.custody_shifts cs ON cs.id = csr.custody_shift_id
    WHERE csr.business_id = p_business_id AND csr.branch_id = p_branch_id
      AND csr.reconciled_by = p_actor_id AND csr.status = 'submitted'
      AND cs.user_id = p_actor_id
    ORDER BY csr.reconciled_at DESC
    LIMIT 1
    FOR UPDATE OF csr;
    IF FOUND THEN
      RETURN jsonb_build_object(
        'custody_shift_id', v_existing.custody_shift_id,
        'status', v_existing.status,
        'lines', v_existing.accepted_stock_snapshot,
        'physical_counts', v_existing.physical_count_snapshot,
        'reconciled_at', v_existing.reconciled_at
      );
    END IF;
    RAISE EXCEPTION 'There is no open or pending custody count for this account.';
  END IF;

  -- Every accepted product must be counted, and client product IDs must map
  -- exactly to this recipient's accepted custody ledger.
  IF EXISTS (
    SELECT 1
    FROM (
      SELECT product_id FROM public.custody_shift_inventory
      WHERE custody_shift_id = v_shift.id
      GROUP BY product_id
    ) issued
    FULL JOIN (
      SELECT product_id FROM jsonb_to_recordset(v_normalized) AS line(
        product_id uuid, used_quantity numeric, returned_quantity numeric,
        wasted_quantity numeric, physical_count numeric
      )
    ) supplied USING (product_id)
    WHERE issued.product_id IS NULL OR supplied.product_id IS NULL
  ) THEN
    RAISE EXCEPTION 'The submitted product list does not match accepted stock.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (
      SELECT product_id, sum(quantity_received) AS issued_quantity
      FROM public.custody_shift_inventory
      WHERE custody_shift_id = v_shift.id
      GROUP BY product_id
    ) issued
    JOIN jsonb_to_recordset(v_normalized) AS line(
      product_id uuid, used_quantity numeric, returned_quantity numeric,
      wasted_quantity numeric, physical_count numeric
    ) USING (product_id)
    WHERE line.used_quantity + line.returned_quantity + line.wasted_quantity > issued.issued_quantity
  ) THEN
    RAISE EXCEPTION 'Used, returned, and wasted amounts cannot exceed the issued quantity.';
  END IF;

  SELECT
    jsonb_agg(jsonb_build_object(
      'product_id', issued.product_id,
      'product_name', COALESCE(p.name_am, p.name, 'Product'),
      'quantity_issued', issued.issued_quantity,
      'quantity_used', line.used_quantity,
      'quantity_returned', line.returned_quantity,
      'quantity_wasted', line.wasted_quantity,
      'expected_remaining', issued.issued_quantity - line.used_quantity - line.returned_quantity - line.wasted_quantity,
      'physical_count', line.physical_count,
      'difference', line.physical_count - (issued.issued_quantity - line.used_quantity - line.returned_quantity - line.wasted_quantity)
    ) ORDER BY issued.product_id),
    jsonb_agg(jsonb_build_object(
      'product_id', issued.product_id,
      'product_name', COALESCE(p.name_am, p.name, 'Product'),
      'physical_count', line.physical_count
    ) ORDER BY issued.product_id)
  INTO v_report_lines, v_physical_snapshot
  FROM (
    SELECT product_id, sum(quantity_received) AS issued_quantity
    FROM public.custody_shift_inventory
    WHERE custody_shift_id = v_shift.id
    GROUP BY product_id
  ) issued
  JOIN jsonb_to_recordset(v_normalized) AS line(
    product_id uuid, used_quantity numeric, returned_quantity numeric,
    wasted_quantity numeric, physical_count numeric
  ) USING (product_id)
  JOIN public.products p ON p.id = issued.product_id AND p.business_id = p_business_id;

  INSERT INTO public.custody_shift_reconciliations (
    business_id, branch_id, custody_shift_id, closed_by, closed_at,
    accepted_stock_snapshot, physical_count_snapshot, status, request_id,
    submitted_lines, reconciled_by, reconciled_at
  ) VALUES (
    p_business_id, p_branch_id, v_shift.id, p_actor_id, v_now,
    v_report_lines, v_physical_snapshot, 'submitted', p_request_id,
    v_normalized, p_actor_id, v_now
  )
  ON CONFLICT (custody_shift_id) DO UPDATE SET
    closed_by = EXCLUDED.closed_by,
    accepted_stock_snapshot = EXCLUDED.accepted_stock_snapshot,
    physical_count_snapshot = EXCLUDED.physical_count_snapshot,
    status = 'submitted',
    request_id = EXCLUDED.request_id,
    submitted_lines = EXCLUDED.submitted_lines,
    reconciled_by = EXCLUDED.reconciled_by,
    reconciled_at = EXCLUDED.reconciled_at;

  IF v_shift.status = 'ACTIVE' THEN
    UPDATE public.custody_shifts
    SET status = 'CLOSED', closed_at = v_now, closed_by = p_actor_id,
        close_reason = 'recipient_reconciliation'
    WHERE id = v_shift.id;
  END IF;

  RETURN jsonb_build_object(
    'custody_shift_id', v_shift.id,
    'status', 'submitted',
    'lines', v_report_lines,
    'physical_counts', v_physical_snapshot,
    'reconciled_at', v_now
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_custody_stock_reconciliation(uuid, uuid, uuid, uuid, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_custody_stock_reconciliation(uuid, uuid, uuid, uuid, jsonb)
  TO service_role;
