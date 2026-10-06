-- Custody shifts track physical stock responsibility independently from cash
-- shifts. All state transitions are initiated by authenticated TypeScript
-- route handlers; this migration adds tables and constraints, not triggers.

CREATE TABLE public.custody_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  closed_by uuid REFERENCES public.profiles(id),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CLOSED')),
  close_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((status = 'ACTIVE' AND closed_at IS NULL) OR (status = 'CLOSED' AND closed_at IS NOT NULL))
);

CREATE UNIQUE INDEX custody_shifts_one_active_per_user_branch
  ON public.custody_shifts (business_id, branch_id, user_id)
  WHERE status = 'ACTIVE';
CREATE INDEX custody_shifts_branch_status_idx
  ON public.custody_shifts (business_id, branch_id, status, opened_at);

CREATE TABLE public.custody_shift_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  custody_shift_id uuid NOT NULL REFERENCES public.custody_shifts(id),
  handover_id uuid NOT NULL REFERENCES public.stock_handovers(id),
  product_id uuid NOT NULL REFERENCES public.products(id),
  quantity_received numeric(12,2) NOT NULL CHECK (quantity_received > 0),
  accepted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (handover_id)
);

CREATE INDEX custody_shift_inventory_shift_product_idx
  ON public.custody_shift_inventory (business_id, branch_id, custody_shift_id, product_id);

CREATE TABLE public.custody_shift_reconciliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  custody_shift_id uuid NOT NULL UNIQUE REFERENCES public.custody_shifts(id),
  closed_by uuid NOT NULL REFERENCES public.profiles(id),
  closed_at timestamptz NOT NULL,
  accepted_stock_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  physical_count_snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stock_handovers
  ALTER COLUMN recipient_shift_id DROP NOT NULL,
  ADD COLUMN custody_shift_id uuid REFERENCES public.custody_shifts(id);

ALTER TABLE public.custody_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custody_shift_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custody_shift_reconciliations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.custody_shifts FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.custody_shift_inventory FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.custody_shift_reconciliations FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.custody_shifts TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.custody_shift_inventory TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.custody_shift_reconciliations TO service_role;

-- Preserve the inventory-row lock used by the original issue route while
-- allowing a recipient to receive stock without a monetary POS shift.
CREATE OR REPLACE FUNCTION public.issue_stock_handover(
  p_request_id uuid,
  p_business_id uuid,
  p_branch_id uuid,
  p_issued_by uuid,
  p_received_by uuid,
  p_product_id uuid,
  p_recipient_shift_id uuid,
  p_quantity numeric
) RETURNS public.stock_handovers
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_existing public.stock_handovers%ROWTYPE;
  v_on_hand numeric(12,2);
  v_reserved numeric(12,2);
  v_result public.stock_handovers%ROWTYPE;
BEGIN
  SELECT * INTO v_existing
  FROM public.stock_handovers
  WHERE business_id = p_business_id AND request_id = p_request_id;
  IF FOUND THEN
    IF v_existing.branch_id <> p_branch_id
      OR v_existing.issued_by_clerk_id <> p_issued_by
      OR v_existing.received_by_user_id <> p_received_by
      OR v_existing.product_id <> p_product_id
      OR v_existing.quantity_issued <> p_quantity THEN
      RAISE EXCEPTION 'Handover request ID was reused with different details.';
    END IF;
    RETURN v_existing;
  END IF;

  IF p_quantity <= 0 THEN RAISE EXCEPTION 'Quantity must be greater than zero.'; END IF;

  SELECT i.quantity INTO v_on_hand
  FROM public.inventory i
  WHERE i.business_id = p_business_id AND i.branch_id = p_branch_id AND i.product_id = p_product_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Inventory record not found for this product and branch.'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = p_received_by AND p.business_id = p_business_id
      AND p.branch_id = p_branch_id AND p.is_active = true AND p.deleted_at IS NULL
  ) THEN RAISE EXCEPTION 'Recipient is not an active member of this branch.'; END IF;

  SELECT
    COALESCE((
      SELECT sum(h.quantity_issued)
      FROM public.stock_handovers h
      WHERE h.business_id = p_business_id AND h.branch_id = p_branch_id
        AND h.product_id = p_product_id AND h.status = 'pending_verification'
    ), 0)
    + COALESCE((
      SELECT sum(csi.quantity_received)
      FROM public.custody_shift_inventory csi
      JOIN public.custody_shifts cs ON cs.id = csi.custody_shift_id
      WHERE csi.business_id = p_business_id AND csi.branch_id = p_branch_id
        AND csi.product_id = p_product_id AND cs.status = 'ACTIVE'
    ), 0)
  INTO v_reserved;

  IF v_on_hand - v_reserved < p_quantity THEN
    RAISE EXCEPTION 'Not enough unassigned stock for this handover.';
  END IF;

  INSERT INTO public.stock_handovers (
    request_id, business_id, branch_id, issued_by_clerk_id,
    received_by_user_id, product_id, recipient_shift_id, quantity_issued
  ) VALUES (
    p_request_id, p_business_id, p_branch_id, p_issued_by,
    p_received_by, p_product_id, p_recipient_shift_id, p_quantity
  ) RETURNING * INTO v_result;
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.issue_stock_handover(uuid, uuid, uuid, uuid, uuid, uuid, uuid, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.issue_stock_handover(uuid, uuid, uuid, uuid, uuid, uuid, uuid, numeric) TO service_role;
