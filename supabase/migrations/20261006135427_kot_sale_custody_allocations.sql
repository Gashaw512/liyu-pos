-- Explicit, line-level preparation custody and idempotent sale allocation.
-- Server handlers own state transitions; the RPC below only provides the
-- short transaction needed to reserve ready KOT quantities exactly once.

CREATE TABLE public.kitchen_order_ticket_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  ticket_id uuid NOT NULL REFERENCES public.kitchen_order_tickets(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  product_name text NOT NULL,
  quantity numeric(12,2) NOT NULL CHECK (quantity > 0),
  preparation_status text NOT NULL DEFAULT 'pending' CHECK (preparation_status IN ('pending','preparing','ready')),
  prepared_by_user_id uuid REFERENCES public.profiles(id),
  custody_shift_id uuid REFERENCES public.custody_shifts(id),
  allocated_quantity numeric(12,2) NOT NULL DEFAULT 0 CHECK (allocated_quantity >= 0),
  wasted_quantity numeric(12,2) NOT NULL DEFAULT 0 CHECK (wasted_quantity >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ticket_id, product_id),
  CHECK (allocated_quantity + wasted_quantity <= quantity),
  CHECK ((prepared_by_user_id IS NULL AND custody_shift_id IS NULL) OR (prepared_by_user_id IS NOT NULL AND custody_shift_id IS NOT NULL))
);

CREATE INDEX kitchen_order_ticket_lines_ready_idx
  ON public.kitchen_order_ticket_lines (business_id, branch_id, product_id, ticket_id)
  WHERE preparation_status = 'ready';

CREATE OR REPLACE FUNCTION public.transition_kot_ticket(
  p_ticket_id uuid,
  p_business_id uuid,
  p_branch_id uuid,
  p_expected_status text,
  p_next_status text,
  p_prepared_by_user_id uuid DEFAULT NULL,
  p_custody_shift_id uuid DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_ticket public.kitchen_order_tickets%ROWTYPE;
BEGIN
  IF NOT ((p_expected_status = 'pending' AND p_next_status = 'preparing')
       OR (p_expected_status = 'preparing' AND p_next_status = 'ready')) THEN
    RAISE EXCEPTION 'Invalid KOT preparation state transition.';
  END IF;
  IF p_next_status = 'ready' AND (p_prepared_by_user_id IS NULL OR p_custody_shift_id IS NULL) THEN
    RAISE EXCEPTION 'Ready tickets require an authenticated worker and custody shift.';
  END IF;

  SELECT * INTO v_ticket FROM public.kitchen_order_tickets
   WHERE id = p_ticket_id AND business_id = p_business_id AND branch_id = p_branch_id
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ticket not found.'; END IF;
  IF v_ticket.preparation_status <> p_expected_status THEN RETURN false; END IF;

  IF p_next_status = 'ready' AND NOT EXISTS (
    SELECT 1 FROM public.custody_shifts cs
    WHERE cs.id = p_custody_shift_id AND cs.business_id = p_business_id
      AND cs.branch_id = p_branch_id AND cs.user_id = p_prepared_by_user_id
      AND cs.status = 'ACTIVE'
  ) THEN
    RAISE EXCEPTION 'Active custody shift does not belong to the preparing worker.';
  END IF;

  UPDATE public.kitchen_order_ticket_lines
    SET preparation_status = p_next_status,
        prepared_by_user_id = CASE WHEN p_next_status = 'ready' THEN p_prepared_by_user_id ELSE prepared_by_user_id END,
        custody_shift_id = CASE WHEN p_next_status = 'ready' THEN p_custody_shift_id ELSE custody_shift_id END,
        updated_at = now()
    WHERE ticket_id = p_ticket_id AND preparation_status = p_expected_status;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ticket has no items ready for this transition.'; END IF;

  UPDATE public.kitchen_order_tickets
    SET preparation_status = p_next_status, updated_at = now()
    WHERE id = p_ticket_id;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.transition_kot_ticket(uuid, uuid, uuid, text, text, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.transition_kot_ticket(uuid, uuid, uuid, text, text, uuid, uuid) TO service_role;

-- Existing tickets are visible but intentionally not attributable to a worker.
INSERT INTO public.kitchen_order_ticket_lines
  (business_id, branch_id, ticket_id, product_id, product_name, quantity, preparation_status)
SELECT t.business_id, t.branch_id, t.id,
       CASE WHEN (line->>'product_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN (line->>'product_id')::uuid ELSE NULL END,
       COALESCE(line->>'name', 'Item'), CASE WHEN (line->>'quantity') ~ '^[0-9]+(\.[0-9]+)?$' THEN (line->>'quantity')::numeric ELSE 0 END,
       CASE WHEN t.preparation_status = 'ready' THEN 'ready'
            WHEN t.preparation_status = 'preparing' THEN 'preparing'
            ELSE 'pending' END
FROM public.kitchen_order_tickets t
CROSS JOIN LATERAL jsonb_array_elements(t.item_payload) AS items(line)
WHERE (line->>'product_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  AND CASE WHEN (line->>'quantity') ~ '^[0-9]+(\.[0-9]+)?$' THEN (line->>'quantity')::numeric > 0 ELSE false END
ON CONFLICT (ticket_id, product_id) DO NOTHING;

CREATE TABLE public.kot_sale_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  sale_item_id uuid NOT NULL REFERENCES public.sale_items(id) ON DELETE CASCADE,
  ticket_line_id uuid NOT NULL REFERENCES public.kitchen_order_ticket_lines(id),
  custody_shift_id uuid NOT NULL REFERENCES public.custody_shifts(id),
  product_id uuid NOT NULL REFERENCES public.products(id),
  quantity numeric(12,2) NOT NULL CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sale_item_id, ticket_line_id)
);

CREATE TABLE public.kot_wastage_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.open_table_orders(id) ON DELETE CASCADE,
  order_revision integer NOT NULL,
  ticket_line_id uuid NOT NULL REFERENCES public.kitchen_order_ticket_lines(id),
  custody_shift_id uuid NOT NULL REFERENCES public.custody_shifts(id),
  product_id uuid NOT NULL REFERENCES public.products(id),
  quantity numeric(12,2) NOT NULL CHECK (quantity > 0),
  reason text NOT NULL DEFAULT 'Prepared item removed from order',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, order_revision, ticket_line_id)
);

CREATE INDEX kot_sale_allocations_shift_product_idx
  ON public.kot_sale_allocations (business_id, branch_id, custody_shift_id, product_id, created_at);

ALTER TABLE public.kitchen_order_ticket_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kot_sale_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kot_wastage_allocations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.kitchen_order_ticket_lines, public.kot_sale_allocations FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.kot_wastage_allocations FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.kitchen_order_ticket_lines TO service_role;
GRANT SELECT, INSERT ON public.kot_sale_allocations TO service_role;
GRANT SELECT, INSERT ON public.kot_wastage_allocations TO service_role;

CREATE OR REPLACE FUNCTION public.commit_table_order_update(
  p_order_id uuid,
  p_business_id uuid,
  p_branch_id uuid,
  p_expected_revision integer,
  p_items jsonb,
  p_total_amount numeric,
  p_status text,
  p_actor_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_order public.open_table_orders%ROWTYPE;
  v_updated public.open_table_orders%ROWTYPE;
  v_removed record;
  v_line public.kitchen_order_ticket_lines%ROWTYPE;
  v_needed numeric(12,2);
  v_available numeric(12,2);
  v_take numeric(12,2);
  v_new_revision integer;
BEGIN
  IF jsonb_typeof(p_items) <> 'array' OR p_status NOT IN ('open','completed','cancelled') THEN
    RAISE EXCEPTION 'Invalid table order update.';
  END IF;
  SELECT * INTO v_order FROM public.open_table_orders
    WHERE id = p_order_id AND business_id = p_business_id AND branch_id = p_branch_id
    FOR UPDATE;
  IF NOT FOUND OR v_order.revision <> p_expected_revision OR v_order.status <> 'open' THEN
    RETURN NULL;
  END IF;
  v_new_revision := v_order.revision + 1;

  -- Prepared quantities removed by an authorized correction/cancel are
  -- recorded against their original custody shift in this same transaction.
  FOR v_removed IN
    WITH old_lines AS (
      SELECT value->>'product_id' AS product_id,
             SUM(GREATEST(COALESCE((value->>'quantity')::numeric, 0), 0)) AS qty
      FROM jsonb_array_elements(v_order.items) GROUP BY value->>'product_id'
    ), new_lines AS (
      SELECT value->>'product_id' AS product_id,
             SUM(GREATEST(COALESCE((value->>'quantity')::numeric, 0), 0)) AS qty
      FROM jsonb_array_elements(p_items) GROUP BY value->>'product_id'
    )
    SELECT o.product_id, o.qty - COALESCE(n.qty, 0) AS qty
    FROM old_lines o LEFT JOIN new_lines n USING (product_id)
    WHERE o.qty > COALESCE(n.qty, 0)
  LOOP
    v_needed := v_removed.qty;
    FOR v_line IN
      SELECT kl.* FROM public.kitchen_order_ticket_lines kl
      JOIN public.kitchen_order_tickets kt ON kt.id = kl.ticket_id
      WHERE kt.order_id = p_order_id AND kl.product_id::text = v_removed.product_id
        AND kl.preparation_status = 'ready' AND kl.custody_shift_id IS NOT NULL
      ORDER BY kt.created_at, kl.created_at, kl.id
      FOR UPDATE OF kl
    LOOP
      EXIT WHEN v_needed <= 0;
      v_available := v_line.quantity - v_line.allocated_quantity - v_line.wasted_quantity;
      IF v_available <= 0 THEN CONTINUE; END IF;
      v_take := LEAST(v_needed, v_available);
      UPDATE public.kitchen_order_ticket_lines
        SET wasted_quantity = wasted_quantity + v_take, updated_at = now()
        WHERE id = v_line.id;
      INSERT INTO public.kot_wastage_allocations
        (business_id, branch_id, order_id, order_revision, ticket_line_id, custody_shift_id, product_id, quantity)
      VALUES (p_business_id, p_branch_id, p_order_id, v_new_revision, v_line.id, v_line.custody_shift_id, v_line.product_id, v_take);
      v_needed := v_needed - v_take;
    END LOOP;
  END LOOP;

  UPDATE public.open_table_orders SET
    items = p_items, total_amount = p_total_amount, revision = v_new_revision,
    status = p_status, cashier_id = p_actor_id, updated_at = now()
  WHERE id = p_order_id
  RETURNING * INTO v_updated;
  RETURN to_jsonb(v_updated);
END;
$$;

REVOKE ALL ON FUNCTION public.commit_table_order_update(uuid, uuid, uuid, integer, jsonb, numeric, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.commit_table_order_update(uuid, uuid, uuid, integer, jsonb, numeric, text, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.allocate_ready_kot_lines_for_sale(
  p_sale_id uuid,
  p_business_id uuid,
  p_branch_id uuid,
  p_table_id uuid
) RETURNS TABLE (sale_item_id uuid, product_id uuid, quantity numeric, custody_shift_id uuid)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_sale public.sales%ROWTYPE;
  v_sale_item public.sale_items%ROWTYPE;
  v_line public.kitchen_order_ticket_lines%ROWTYPE;
  v_needed numeric(12,2);
  v_available numeric(12,2);
  v_take numeric(12,2);
BEGIN
  SELECT * INTO v_sale FROM public.sales
   WHERE id = p_sale_id AND business_id = p_business_id AND branch_id = p_branch_id
   FOR UPDATE;
  IF NOT FOUND OR v_sale.status <> 'completed' THEN
    RAISE EXCEPTION 'Completed sale not found for this business and branch.';
  END IF;
  IF v_sale.table_id IS DISTINCT FROM p_table_id THEN
    RAISE EXCEPTION 'Sale table does not match the allocation request.';
  END IF;

  -- A completed retry returns its existing allocations without consuming a
  -- second time. Sale-row locking serializes concurrent retries of this sale.
  IF EXISTS (SELECT 1 FROM public.kot_sale_allocations a WHERE a.sale_id = p_sale_id) THEN
    RETURN QUERY SELECT a.sale_item_id, a.product_id, a.quantity, a.custody_shift_id
      FROM public.kot_sale_allocations a WHERE a.sale_id = p_sale_id;
    RETURN;
  END IF;
  IF p_table_id IS NULL THEN RETURN; END IF;

  FOR v_sale_item IN
    SELECT si.* FROM public.sale_items si WHERE si.sale_id = p_sale_id ORDER BY si.created_at, si.id
  LOOP
    v_needed := v_sale_item.quantity;
    FOR v_line IN
      SELECT kl.*
      FROM public.kitchen_order_ticket_lines kl
      JOIN public.kitchen_order_tickets kt ON kt.id = kl.ticket_id
      JOIN public.custody_shifts cs ON cs.id = kl.custody_shift_id
      WHERE kt.business_id = p_business_id AND kt.branch_id = p_branch_id
        AND kt.table_id = p_table_id AND kt.preparation_status = 'ready'
        AND kl.product_id = v_sale_item.product_id AND kl.preparation_status = 'ready'
        AND kl.prepared_by_user_id = cs.user_id
        AND kl.custody_shift_id IS NOT NULL
      ORDER BY kt.created_at, kl.created_at, kl.id
      FOR UPDATE OF kl
    LOOP
      EXIT WHEN v_needed <= 0;
      v_available := v_line.quantity - v_line.allocated_quantity - v_line.wasted_quantity;
      IF v_available <= 0 THEN CONTINUE; END IF;
      v_take := LEAST(v_needed, v_available);
      UPDATE public.kitchen_order_ticket_lines
        SET allocated_quantity = allocated_quantity + v_take, updated_at = now()
        WHERE id = v_line.id;
      INSERT INTO public.kot_sale_allocations
        (business_id, branch_id, sale_id, sale_item_id, ticket_line_id, custody_shift_id, product_id, quantity)
      VALUES (p_business_id, p_branch_id, p_sale_id, v_sale_item.id, v_line.id, v_line.custody_shift_id, v_line.product_id, v_take);
      sale_item_id := v_sale_item.id;
      product_id := v_line.product_id;
      quantity := v_take;
      custody_shift_id := v_line.custody_shift_id;
      RETURN NEXT;
      v_needed := v_needed - v_take;
    END LOOP;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.allocate_ready_kot_lines_for_sale(uuid, uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.allocate_ready_kot_lines_for_sale(uuid, uuid, uuid, uuid) TO service_role;
