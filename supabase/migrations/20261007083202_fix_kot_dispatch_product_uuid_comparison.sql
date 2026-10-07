-- The KOT trigger extracts product IDs from order JSON as text. Cast the
-- validated UUID before joining to products.id (uuid) so order saves do not
-- fail with "operator does not exist: uuid = text".
CREATE OR REPLACE FUNCTION app_private.dispatch_table_order_kots()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  kitchen_lines jsonb;
  bar_lines jsonb;
  order_table_name text;
  staff_name text;
BEGIN
  IF NEW.status <> 'open' THEN RETURN NEW; END IF;

  SELECT rt.name INTO order_table_name
  FROM public.restaurant_tables rt
  WHERE rt.id = NEW.table_id AND rt.business_id = NEW.business_id AND rt.branch_id = NEW.branch_id;
  SELECT COALESCE(p.full_name, 'Staff') INTO staff_name
  FROM public.profiles p WHERE p.id = NEW.cashier_id;

  WITH current_items AS (
    SELECT e.value AS line, e.value->>'product_id' AS product_id,
      GREATEST(COALESCE((e.value->>'quantity')::numeric, 0), 0) AS quantity
    FROM jsonb_array_elements(NEW.items) e(value)
    WHERE (e.value->>'product_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ), current_totals AS (
    SELECT product_id, SUM(quantity) AS quantity, (array_agg(line))[1] AS line
    FROM current_items GROUP BY product_id
  ), prior_items AS (
    SELECT e.value->>'product_id' AS product_id,
      SUM(GREATEST(COALESCE((e.value->>'quantity')::numeric, 0), 0)) AS quantity
    FROM jsonb_array_elements(CASE WHEN TG_OP = 'UPDATE' THEN OLD.items ELSE '[]'::jsonb END) e(value)
    GROUP BY e.value->>'product_id'
  ), deltas AS (
    SELECT ci.line, ci.product_id, ci.quantity - COALESCE(pi.quantity, 0) AS quantity
    FROM current_totals ci LEFT JOIN prior_items pi USING (product_id)
    WHERE ci.quantity > COALESCE(pi.quantity, 0)
  ), classified AS (
    SELECT jsonb_build_object(
      'product_id', d.product_id,
      'name', COALESCE(p.name, d.line->>'product_name', 'Item'),
      'name_am', p.name_am,
      'quantity', d.quantity,
      'unit_price', COALESCE((d.line->>'unit_price')::numeric, 0)
    ) AS line,
    COALESCE(p.preparation_station, c.preparation_station, 'kitchen') AS station
    FROM deltas d
    LEFT JOIN public.products p ON p.id = d.product_id::uuid AND p.business_id = NEW.business_id
    LEFT JOIN public.categories c ON c.id = p.category_id AND c.business_id = NEW.business_id
  )
  SELECT COALESCE(jsonb_agg(line) FILTER (WHERE station = 'kitchen'), '[]'::jsonb),
         COALESCE(jsonb_agg(line) FILTER (WHERE station = 'bar'), '[]'::jsonb)
  INTO kitchen_lines, bar_lines
  FROM classified;

  IF jsonb_array_length(kitchen_lines) > 0 THEN
    INSERT INTO public.kitchen_order_tickets
      (business_id, branch_id, order_id, order_revision, table_id, table_number, waiter_id, waiter_name, item_payload, destination_station)
    VALUES (NEW.business_id, NEW.branch_id, NEW.id, NEW.revision, NEW.table_id, COALESCE(order_table_name, 'Table'), NEW.cashier_id, COALESCE(staff_name, 'Staff'), kitchen_lines, 'kitchen')
    ON CONFLICT (order_id, order_revision, destination_station) DO NOTHING;
  END IF;
  IF jsonb_array_length(bar_lines) > 0 THEN
    INSERT INTO public.kitchen_order_tickets
      (business_id, branch_id, order_id, order_revision, table_id, table_number, waiter_id, waiter_name, item_payload, destination_station)
    VALUES (NEW.business_id, NEW.branch_id, NEW.id, NEW.revision, NEW.table_id, COALESCE(order_table_name, 'Table'), NEW.cashier_id, COALESCE(staff_name, 'Staff'), bar_lines, 'bar')
    ON CONFLICT (order_id, order_revision, destination_station) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION app_private.dispatch_table_order_kots() FROM PUBLIC, anon, authenticated;
