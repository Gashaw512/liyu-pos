-- Custody transfers are a separate branch-level accountability ledger. They do
-- not alter inventory.quantity; existing POS sales continue to deduct branch
-- stock through the established inventory/FIFO pipeline.

-- The database role `authenticated` is shared across app users, so per-user
-- role permissions must be expressed as RLS policies, not global table GRANTs.
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Products managed by authorized staff" ON public.products;
DROP POLICY IF EXISTS "Products managed by management" ON public.products;
CREATE POLICY "Products managed by management" ON public.products
  FOR ALL TO authenticated
  USING (business_id = public.auth_business_id()
    AND deleted_at IS NULL
    AND public.auth_has_any_role(ARRAY['owner','manager']))
  WITH CHECK (business_id = public.auth_business_id()
    AND public.auth_has_any_role(ARRAY['owner','manager']));

DROP POLICY IF EXISTS "Categories managed by authorized staff" ON public.categories;
DROP POLICY IF EXISTS "Categories managed by management" ON public.categories;
CREATE POLICY "Categories managed by management" ON public.categories
  FOR ALL TO authenticated
  USING (business_id = public.auth_business_id()
    AND deleted_at IS NULL
    AND public.auth_has_any_role(ARRAY['owner','manager']))
  WITH CHECK (business_id = public.auth_business_id()
    AND public.auth_has_any_role(ARRAY['owner','manager']));

CREATE TABLE public.stock_handovers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  issued_by_clerk_id uuid NOT NULL REFERENCES public.profiles(id),
  received_by_user_id uuid NOT NULL REFERENCES public.profiles(id),
  product_id uuid NOT NULL REFERENCES public.products(id),
  recipient_shift_id uuid NOT NULL REFERENCES public.shifts(id),
  quantity_issued numeric(12,2) NOT NULL CHECK (quantity_issued > 0),
  status text NOT NULL DEFAULT 'pending_verification'
    CHECK (status IN ('pending_verification', 'accepted', 'disputed')),
  dispute_reason text,
  issued_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz,
  verified_by uuid REFERENCES public.profiles(id),
  UNIQUE (business_id, request_id),
  CHECK (issued_by_clerk_id <> received_by_user_id)
);

CREATE INDEX stock_handovers_recipient_status_idx
  ON public.stock_handovers (business_id, branch_id, received_by_user_id, status, issued_at DESC);
CREATE INDEX stock_handovers_product_status_idx
  ON public.stock_handovers (business_id, branch_id, product_id, status, issued_at);
CREATE INDEX stock_handovers_shift_idx
  ON public.stock_handovers (business_id, branch_id, recipient_shift_id, status);

ALTER TABLE public.stock_handovers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stock_handovers FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.stock_handovers TO service_role;

-- All mutations go through authenticated application routes. The RPCs run as
-- service_role only after the route has verified the acting profile and role.
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
    SELECT 1 FROM public.shifts s
    WHERE s.id = p_recipient_shift_id AND s.business_id = p_business_id
      AND s.branch_id = p_branch_id AND s.cashier_id = p_received_by AND s.status = 'open'
  ) THEN RAISE EXCEPTION 'Recipient must have an active shift in this branch.'; END IF;

  -- Pending requests reserve stock. Accepted custody is reduced by completed
  -- sales recorded on that recipient's shift, without changing POS stock.
  SELECT
    COALESCE((
      SELECT sum(h.quantity_issued)
      FROM public.stock_handovers h
      WHERE h.business_id = p_business_id AND h.branch_id = p_branch_id
        AND h.product_id = p_product_id AND h.status = 'pending_verification'
    ), 0)
    + COALESCE((
      SELECT sum(greatest(g.issued - COALESCE(sold.quantity, 0), 0))
      FROM (
        SELECT h.recipient_shift_id, sum(h.quantity_issued) AS issued, min(h.verified_at) AS accepted_from
        FROM public.stock_handovers h
        WHERE h.business_id = p_business_id AND h.branch_id = p_branch_id
          AND h.product_id = p_product_id AND h.status = 'accepted'
        GROUP BY h.recipient_shift_id
      ) g
      LEFT JOIN LATERAL (
        SELECT sum(si.quantity) AS quantity
        FROM public.sales s
        JOIN public.sale_items si ON si.sale_id = s.id
        WHERE s.business_id = p_business_id AND s.branch_id = p_branch_id
          AND s.shift_id = g.recipient_shift_id AND s.status = 'completed'
          AND s.created_at >= g.accepted_from AND si.product_id = p_product_id
      ) sold ON true
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

CREATE OR REPLACE FUNCTION public.verify_stock_handover(
  p_handover_id uuid,
  p_business_id uuid,
  p_branch_id uuid,
  p_actor_id uuid,
  p_decision text,
  p_dispute_reason text DEFAULT NULL
) RETURNS public.stock_handovers
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_handover public.stock_handovers%ROWTYPE;
  v_result public.stock_handovers%ROWTYPE;
BEGIN
  SELECT * INTO v_handover
  FROM public.stock_handovers
  WHERE id = p_handover_id AND business_id = p_business_id AND branch_id = p_branch_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Handover not found.'; END IF;
  IF v_handover.received_by_user_id <> p_actor_id THEN RAISE EXCEPTION 'Only the selected recipient can verify this handover.'; END IF;
  IF p_decision NOT IN ('accepted', 'disputed') THEN RAISE EXCEPTION 'Invalid handover decision.'; END IF;

  IF v_handover.status = p_decision THEN RETURN v_handover; END IF;
  IF v_handover.status <> 'pending_verification' THEN RAISE EXCEPTION 'This handover has already been resolved.'; END IF;

  IF p_decision = 'accepted' AND NOT EXISTS (
    SELECT 1 FROM public.shifts s
    WHERE s.id = v_handover.recipient_shift_id AND s.business_id = p_business_id
      AND s.branch_id = p_branch_id AND s.cashier_id = p_actor_id AND s.status = 'open'
  ) THEN RAISE EXCEPTION 'The recipient shift is no longer active. Ask the storekeeper to issue it again.'; END IF;

  UPDATE public.stock_handovers
  SET status = p_decision,
      verified_by = p_actor_id,
      verified_at = now(),
      dispute_reason = CASE WHEN p_decision = 'disputed' THEN nullif(btrim(p_dispute_reason), '') ELSE NULL END
  WHERE id = v_handover.id
  RETURNING * INTO v_result;
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.issue_stock_handover(uuid, uuid, uuid, uuid, uuid, uuid, uuid, numeric) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.verify_stock_handover(uuid, uuid, uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.issue_stock_handover(uuid, uuid, uuid, uuid, uuid, uuid, uuid, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_stock_handover(uuid, uuid, uuid, uuid, text, text) TO service_role;
