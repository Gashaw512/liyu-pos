-- FIFO inventory valuation layers and immutable sale-item cost allocations.

-- Keep the exact extended cost for mixed-batch sale lines. cost_price remains
-- the displayable weighted unit cost, while gross_profit uses cost_total.
ALTER TABLE public.inventory_movements
  ADD COLUMN balance_after NUMERIC(10,2);

ALTER TABLE public.sale_items
  ADD COLUMN cost_total NUMERIC(12,4) NOT NULL DEFAULT 0;

UPDATE public.sale_items
SET cost_total = cost_price * quantity;

ALTER TABLE public.sale_items
  DROP COLUMN gross_profit;

ALTER TABLE public.sale_items
  ADD COLUMN gross_profit NUMERIC(10,2)
  GENERATED ALWAYS AS (((unit_price - discount) * quantity) - cost_total) STORED;

CREATE TABLE public.inventory_cost_layers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fifo_sequence BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id),
  product_id UUID NOT NULL REFERENCES public.products(id),
  source_movement_id UUID UNIQUE REFERENCES public.inventory_movements(id) ON DELETE SET NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  quantity_received NUMERIC(10,2) NOT NULL CHECK (quantity_received > 0),
  quantity_remaining NUMERIC(10,2) NOT NULL CHECK (
    quantity_remaining >= 0 AND quantity_remaining <= quantity_received
  ),
  unit_cost NUMERIC(10,2) NOT NULL CHECK (unit_cost >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inventory_cost_layers_fifo
  ON public.inventory_cost_layers (business_id, branch_id, product_id, received_at, fifo_sequence)
  WHERE quantity_remaining > 0;

CREATE TABLE public.inventory_cost_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_item_id UUID NOT NULL REFERENCES public.sale_items(id)
    ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
  cost_layer_id UUID REFERENCES public.inventory_cost_layers(id) ON DELETE RESTRICT,
  quantity NUMERIC(10,2) NOT NULL CHECK (quantity > 0),
  unit_cost NUMERIC(10,2) NOT NULL CHECK (unit_cost >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inventory_cost_allocations_sale_item
  ON public.inventory_cost_allocations (sale_item_id);

ALTER TABLE public.inventory_cost_layers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_cost_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inventory cost layers are readable within their business"
  ON public.inventory_cost_layers
  FOR SELECT
  USING (business_id = public.auth_business_id());

CREATE POLICY "Sale cost allocations are readable within their business"
  ON public.inventory_cost_allocations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.sale_items si
      JOIN public.sales s ON s.id = si.sale_id
      WHERE si.id = inventory_cost_allocations.sale_item_id
        AND s.business_id = public.auth_business_id()
        AND s.deleted_at IS NULL
    )
  );

-- Existing stock becomes one carry-forward layer per product/branch. Existing
-- sale_items.cost_price/gross_profit values are intentionally left untouched.
INSERT INTO public.inventory_cost_layers (
  business_id,
  branch_id,
  product_id,
  received_at,
  quantity_received,
  quantity_remaining,
  unit_cost
)
SELECT
  i.business_id,
  i.branch_id,
  i.product_id,
  '-infinity'::timestamptz,
  i.quantity,
  i.quantity,
  GREATEST(COALESCE(p.cost_price, 0), 0)
FROM public.inventory i
JOIN public.products p ON p.id = i.product_id
WHERE i.quantity > 0;

CREATE OR REPLACE FUNCTION public.consume_inventory_fifo(
  p_business_id UUID,
  p_branch_id UUID,
  p_product_id UUID,
  p_quantity NUMERIC,
  p_fallback_cost NUMERIC,
  p_sale_item_id UUID DEFAULT NULL
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_layer RECORD;
  v_remaining NUMERIC(10,2) := GREATEST(COALESCE(p_quantity, 0), 0);
  v_take NUMERIC(10,2);
  v_total_cost NUMERIC := 0;
  v_fallback_cost NUMERIC(10,2) := GREATEST(COALESCE(p_fallback_cost, 0), 0);
BEGIN
  IF v_remaining = 0 THEN
    RETURN 0;
  END IF;

  FOR v_layer IN
    SELECT id, quantity_remaining, unit_cost
    FROM public.inventory_cost_layers
    WHERE business_id = p_business_id
      AND branch_id = p_branch_id
      AND product_id = p_product_id
      AND quantity_remaining > 0
    ORDER BY received_at, fifo_sequence
    FOR UPDATE
  LOOP
    EXIT WHEN v_remaining <= 0;
    v_take := LEAST(v_remaining, v_layer.quantity_remaining);

    UPDATE public.inventory_cost_layers
    SET quantity_remaining = quantity_remaining - v_take
    WHERE id = v_layer.id;

    IF p_sale_item_id IS NOT NULL THEN
      INSERT INTO public.inventory_cost_allocations (
        sale_item_id, cost_layer_id, quantity, unit_cost
      ) VALUES (
        p_sale_item_id, v_layer.id, v_take, v_layer.unit_cost
      );
    END IF;

    v_total_cost := v_total_cost + (v_take * v_layer.unit_cost);
    v_remaining := v_remaining - v_take;
  END LOOP;

  -- Preserve the existing allow-negative-stock behavior. If a sale exceeds
  -- available batches, the unstocked portion uses the product's current cost.
  IF v_remaining > 0 THEN
    v_total_cost := v_total_cost + (v_remaining * v_fallback_cost);
    IF p_sale_item_id IS NOT NULL THEN
      INSERT INTO public.inventory_cost_allocations (
        sale_item_id, cost_layer_id, quantity, unit_cost
      ) VALUES (
        p_sale_item_id, NULL, v_remaining, v_fallback_cost
      );
    END IF;
  END IF;

  RETURN v_total_cost;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_inventory_fifo(UUID, UUID, UUID, NUMERIC, NUMERIC, UUID)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.apply_inventory_movement_to_fifo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_inventory_quantity NUMERIC(10,2);
  v_delta NUMERIC(10,2);
  v_unit_cost NUMERIC(10,2);
  v_product_cost NUMERIC(10,2);
BEGIN
  -- Sales are applied atomically by the sale_items trigger, where the exact
  -- sale line is available for its cost allocation.
  IF NEW.movement_type = 'sale' THEN
    RETURN NEW;
  END IF;

  IF NEW.movement_type IN ('purchase', 'opening', 'return', 'transfer_in', 'adjustment') THEN
    v_delta := NEW.quantity;
  ELSIF NEW.movement_type IN ('waste', 'theft', 'transfer_out') THEN
    v_delta := -ABS(NEW.quantity);
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.inventory (business_id, branch_id, product_id, quantity, updated_at)
  VALUES (NEW.business_id, NEW.branch_id, NEW.product_id, 0, COALESCE(NEW.created_at, NOW()))
  ON CONFLICT (branch_id, product_id) DO NOTHING;

  SELECT quantity
  INTO v_inventory_quantity
  FROM public.inventory
  WHERE business_id = NEW.business_id
    AND branch_id = NEW.branch_id
    AND product_id = NEW.product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory record not found for movement %', NEW.id;
  END IF;

  -- Counts record the absolute counted balance. Rebase their variance on the
  -- locked server balance so concurrent sales/receipts cannot be overwritten.
  IF NEW.reference_type = 'inventory_count'
    AND NEW.balance_after IS NOT NULL THEN
    v_delta := NEW.balance_after - v_inventory_quantity;
  END IF;

  SELECT GREATEST(COALESCE(cost_price, 0), 0)
  INTO v_product_cost
  FROM public.products
  WHERE id = NEW.product_id;

  v_unit_cost := GREATEST(COALESCE(NEW.unit_cost, v_product_cost, 0), 0);

  IF v_delta > 0 THEN
    -- Receipts first cover any pre-existing negative balance. Only the
    -- remainder is available as a new FIFO layer.
    INSERT INTO public.inventory_cost_layers (
      business_id, branch_id, product_id, source_movement_id, received_at,
      quantity_received, quantity_remaining, unit_cost
    ) VALUES (
      NEW.business_id,
      NEW.branch_id,
      NEW.product_id,
      NEW.id,
      COALESCE(NEW.created_at, NOW()),
      v_delta,
      GREATEST(v_delta + LEAST(v_inventory_quantity, 0), 0),
      v_unit_cost
    );
  ELSIF v_delta < 0 THEN
    PERFORM public.consume_inventory_fifo(
      NEW.business_id,
      NEW.branch_id,
      NEW.product_id,
      ABS(v_delta),
      v_product_cost,
      NULL
    );
  END IF;

  UPDATE public.inventory
  SET quantity = v_inventory_quantity + v_delta,
      updated_at = COALESCE(NEW.created_at, NOW())
  WHERE business_id = NEW.business_id
    AND branch_id = NEW.branch_id
    AND product_id = NEW.product_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_inventory_movement_fifo
  AFTER INSERT ON public.inventory_movements
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_inventory_movement_to_fifo();

CREATE OR REPLACE FUNCTION public.apply_sale_item_fifo_cost()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_business_id UUID;
  v_branch_id UUID;
  v_sale_created_at TIMESTAMPTZ;
  v_sale_status TEXT;
  v_inventory_quantity NUMERIC(10,2);
  v_product_cost NUMERIC(10,2);
  v_total_cost NUMERIC;
BEGIN
  IF NEW.quantity <= 0 THEN
    NEW.cost_total := NEW.cost_price * NEW.quantity;
    RETURN NEW;
  END IF;

  SELECT business_id, branch_id, created_at, status
  INTO v_business_id, v_branch_id, v_sale_created_at, v_sale_status
  FROM public.sales
  WHERE id = NEW.sale_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sale % was not found for FIFO costing', NEW.sale_id;
  END IF;

  IF v_sale_status <> 'completed' THEN
    NEW.cost_total := NEW.cost_price * NEW.quantity;
    RETURN NEW;
  END IF;

  SELECT quantity
  INTO v_inventory_quantity
  FROM public.inventory
  WHERE business_id = v_business_id
    AND branch_id = v_branch_id
    AND product_id = NEW.product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory record not found for product %', NEW.product_id;
  END IF;

  SELECT GREATEST(COALESCE(cost_price, 0), 0)
  INTO v_product_cost
  FROM public.products
  WHERE id = NEW.product_id;

  v_total_cost := public.consume_inventory_fifo(
    v_business_id,
    v_branch_id,
    NEW.product_id,
    NEW.quantity,
    v_product_cost,
    NEW.id
  );

  NEW.cost_price := ROUND(v_total_cost / NEW.quantity, 2);
  NEW.cost_total := v_total_cost;

  UPDATE public.inventory
  SET quantity = v_inventory_quantity - NEW.quantity,
      updated_at = v_sale_created_at
  WHERE business_id = v_business_id
    AND branch_id = v_branch_id
    AND product_id = NEW.product_id;

  INSERT INTO public.inventory_movements (
    business_id, branch_id, product_id, user_id, movement_type, quantity,
    unit_cost, reference_id, reference_type, notes, created_at
  )
  SELECT
    v_business_id,
    v_branch_id,
    NEW.product_id,
    s.cashier_id,
    'sale',
    -NEW.quantity,
    NEW.cost_price,
    s.id,
    'sale',
    'FIFO cost allocation for sale ' || s.receipt_number,
    COALESCE(v_sale_created_at, NOW())
  FROM public.sales s
  WHERE s.id = NEW.sale_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sale_item_fifo_cost
  BEFORE INSERT ON public.sale_items
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_sale_item_fifo_cost();
