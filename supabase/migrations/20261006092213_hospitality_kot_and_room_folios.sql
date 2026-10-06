-- KOT dispatch and room folios are isolated hospitality extensions.
-- They use existing products/categories, branches, sales, and payments.

DO $$ BEGIN
  CREATE TYPE public.kot_station AS ENUM ('kitchen', 'bar');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.kot_print_status AS ENUM ('pending', 'sent', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.kot_preparation_status AS ENUM ('pending', 'preparing', 'ready');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.kitchen_order_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.open_table_orders(id) ON DELETE CASCADE,
  order_revision integer NOT NULL CHECK (order_revision > 0),
  table_id uuid REFERENCES public.restaurant_tables(id) ON DELETE SET NULL,
  table_number text NOT NULL,
  waiter_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  waiter_name text NOT NULL DEFAULT 'Staff',
  item_payload jsonb NOT NULL CHECK (jsonb_typeof(item_payload) = 'array'),
  destination_station public.kot_station NOT NULL,
  print_status public.kot_print_status NOT NULL DEFAULT 'pending',
  preparation_status public.kot_preparation_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, order_revision, destination_station)
);

CREATE INDEX kitchen_order_tickets_queue_idx
  ON public.kitchen_order_tickets (business_id, branch_id, destination_station, created_at)
  WHERE preparation_status <> 'ready';

ALTER TABLE public.kitchen_order_tickets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.kitchen_order_tickets FROM anon, authenticated;
GRANT SELECT ON public.kitchen_order_tickets TO authenticated;
GRANT UPDATE (print_status, preparation_status, updated_at) ON public.kitchen_order_tickets TO authenticated;

CREATE POLICY kitchen_order_tickets_read
  ON public.kitchen_order_tickets FOR SELECT TO authenticated
  USING (
    business_id = public.auth_business_id()
    AND branch_id = (SELECT branch_id FROM public.profiles WHERE id = (SELECT auth.uid()) AND deleted_at IS NULL)
    AND (
      public.auth_has_any_role(ARRAY['owner','manager'])
      OR (destination_station = 'kitchen' AND public.auth_has_any_role(ARRAY['kitchen']))
      OR (destination_station = 'bar' AND public.auth_has_any_role(ARRAY['barman']))
    )
  );

CREATE POLICY kitchen_order_tickets_update
  ON public.kitchen_order_tickets FOR UPDATE TO authenticated
  USING (
    business_id = public.auth_business_id()
    AND branch_id = (SELECT branch_id FROM public.profiles WHERE id = (SELECT auth.uid()) AND deleted_at IS NULL)
    AND (
      public.auth_has_any_role(ARRAY['owner','manager'])
      OR (destination_station = 'kitchen' AND public.auth_has_any_role(ARRAY['kitchen']))
      OR (destination_station = 'bar' AND public.auth_has_any_role(ARRAY['barman']))
    )
  )
  WITH CHECK (
    business_id = public.auth_business_id()
    AND branch_id = (SELECT branch_id FROM public.profiles WHERE id = (SELECT auth.uid()) AND deleted_at IS NULL)
    AND (
      public.auth_has_any_role(ARRAY['owner','manager'])
      OR (destination_station = 'kitchen' AND public.auth_has_any_role(ARRAY['kitchen']))
      OR (destination_station = 'bar' AND public.auth_has_any_role(ARRAY['barman']))
    )
  );

-- Dispatch only newly added quantities, avoiding reprinting unchanged lines
-- whenever a waiter edits an existing table order.
CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC, anon, authenticated;

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
    CASE
      WHEN lower(COALESCE(c.group_type, '') || ' ' || COALESCE(c.name, '') || ' ' || COALESCE(p.name, '')) ~ '(^|[^a-z])(bar|drink|drinks|beverage|beverages|alcohol|beer|juice|coffee|tea|water)([^a-z]|$)' THEN 'bar'
      ELSE 'kitchen'
    END AS station
    FROM deltas d
    LEFT JOIN public.products p ON p.id = d.product_id AND p.business_id = NEW.business_id
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
CREATE TRIGGER dispatch_table_order_kots
  AFTER INSERT OR UPDATE OF items, revision, status ON public.open_table_orders
  FOR EACH ROW EXECUTE FUNCTION app_private.dispatch_table_order_kots();

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
    AND NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'kitchen_order_tickets') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.kitchen_order_tickets;
  END IF;
END $$;

CREATE TABLE public.hotel_room_folios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  room_number text NOT NULL,
  guest_name text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','checked_out')),
  master_balance numeric(12,2) NOT NULL DEFAULT 0 CHECK (master_balance >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (length(btrim(room_number)) > 0),
  CHECK (length(btrim(guest_name)) > 0)
);
CREATE UNIQUE INDEX hotel_room_folios_one_active_room
  ON public.hotel_room_folios (business_id, branch_id, lower(room_number)) WHERE status = 'active';

CREATE TABLE public.hotel_room_folio_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  branch_id uuid NOT NULL REFERENCES public.branches(id),
  folio_id uuid NOT NULL REFERENCES public.hotel_room_folios(id),
  sale_id uuid NOT NULL UNIQUE REFERENCES public.sales(id),
  room_number text NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  description text NOT NULL DEFAULT 'POS restaurant/bar charge',
  posted_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hotel_room_folios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_room_folio_charges ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.hotel_room_folios, public.hotel_room_folio_charges FROM anon, authenticated;
GRANT SELECT ON public.hotel_room_folios TO authenticated;
GRANT INSERT (business_id, branch_id, room_number, guest_name, status) ON public.hotel_room_folios TO authenticated;
GRANT UPDATE (room_number, guest_name, status, updated_at) ON public.hotel_room_folios TO authenticated;
GRANT SELECT ON public.hotel_room_folio_charges TO authenticated;

CREATE POLICY hotel_room_folios_select ON public.hotel_room_folios FOR SELECT TO authenticated
  USING (business_id = public.auth_business_id()
    AND branch_id = (SELECT branch_id FROM public.profiles WHERE id = (SELECT auth.uid()) AND deleted_at IS NULL)
    AND public.auth_has_any_role(ARRAY['owner','manager','cashier']));
CREATE POLICY hotel_room_folios_manage ON public.hotel_room_folios FOR INSERT TO authenticated
  WITH CHECK (business_id = public.auth_business_id()
    AND branch_id = (SELECT branch_id FROM public.profiles WHERE id = (SELECT auth.uid()) AND deleted_at IS NULL)
    AND public.auth_has_any_role(ARRAY['owner','manager']));
CREATE POLICY hotel_room_folios_update ON public.hotel_room_folios FOR UPDATE TO authenticated
  USING (business_id = public.auth_business_id()
    AND branch_id = (SELECT branch_id FROM public.profiles WHERE id = (SELECT auth.uid()) AND deleted_at IS NULL)
    AND public.auth_has_any_role(ARRAY['owner','manager']))
  WITH CHECK (business_id = public.auth_business_id()
    AND branch_id = (SELECT branch_id FROM public.profiles WHERE id = (SELECT auth.uid()) AND deleted_at IS NULL)
    AND public.auth_has_any_role(ARRAY['owner','manager']));
CREATE POLICY hotel_room_folio_charges_select ON public.hotel_room_folio_charges FOR SELECT TO authenticated
  USING (business_id = public.auth_business_id()
    AND branch_id = (SELECT branch_id FROM public.profiles WHERE id = (SELECT auth.uid()) AND deleted_at IS NULL)
    AND public.auth_has_any_role(ARRAY['owner','manager','cashier']));

CREATE OR REPLACE FUNCTION app_private.reject_folio_charge_mutation()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN RAISE EXCEPTION 'Folio charges are immutable.'; END; $$;
REVOKE ALL ON FUNCTION app_private.reject_folio_charge_mutation() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER hotel_room_folio_charges_immutable
  BEFORE UPDATE OR DELETE ON public.hotel_room_folio_charges
  FOR EACH ROW EXECUTE FUNCTION app_private.reject_folio_charge_mutation();

CREATE OR REPLACE FUNCTION public.post_room_charge_for_sale(
  p_business_id uuid, p_branch_id uuid, p_sale_id uuid, p_actor_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_sale public.sales%ROWTYPE;
  v_room text;
  v_amount numeric(12,2);
  v_payment_count integer;
  v_folio public.hotel_room_folios%ROWTYPE;
  v_charge_id uuid;
BEGIN
  SELECT * INTO v_sale FROM public.sales
   WHERE id = p_sale_id AND business_id = p_business_id AND branch_id = p_branch_id
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sale not found for this business and branch.'; END IF;
  IF v_sale.status <> 'completed' THEN RAISE EXCEPTION 'Only completed sales can be charged to a room.'; END IF;

  SELECT id INTO v_charge_id FROM public.hotel_room_folio_charges WHERE sale_id = p_sale_id;
  IF FOUND THEN RETURN v_charge_id; END IF;

  SELECT min(reference_no), sum(amount), count(*)::integer INTO v_room, v_amount, v_payment_count FROM public.payments
   WHERE sale_id = p_sale_id AND business_id = p_business_id AND method = 'room_charge' AND status = 'completed'
  ;
  IF v_room IS NULL OR btrim(v_room) = '' THEN RAISE EXCEPTION 'Room number is required for room charges.'; END IF;
  IF v_payment_count <> 1 THEN RAISE EXCEPTION 'A room charge must use exactly one payment entry.'; END IF;
  IF v_amount IS NULL OR v_amount <= 0 OR v_amount <> v_sale.total_amount THEN
    RAISE EXCEPTION 'Room charge must equal the sale total.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.payments WHERE sale_id = p_sale_id AND amount > 0 AND method <> 'room_charge') THEN
    RAISE EXCEPTION 'Room charge cannot be combined with other tenders.';
  END IF;

  SELECT * INTO v_folio FROM public.hotel_room_folios
   WHERE business_id = p_business_id AND branch_id = p_branch_id
     AND lower(room_number) = lower(btrim(v_room)) AND status = 'active'
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No active guest folio exists for this room.'; END IF;

  INSERT INTO public.hotel_room_folio_charges
    (business_id, branch_id, folio_id, sale_id, room_number, amount, posted_by)
  VALUES (p_business_id, p_branch_id, v_folio.id, p_sale_id, v_folio.room_number, v_amount, p_actor_id)
  ON CONFLICT (sale_id) DO NOTHING
  RETURNING id INTO v_charge_id;
  IF v_charge_id IS NOT NULL THEN
    UPDATE public.hotel_room_folios SET master_balance = master_balance + v_amount, updated_at = now()
    WHERE id = v_folio.id;
  ELSE
    SELECT id INTO v_charge_id FROM public.hotel_room_folio_charges WHERE sale_id = p_sale_id;
  END IF;

  IF v_sale.table_id IS NOT NULL THEN
    UPDATE public.open_table_orders
      SET items = '[]'::jsonb, total_amount = 0, status = 'completed', revision = revision + 1
    WHERE business_id = p_business_id AND branch_id = p_branch_id AND table_id = v_sale.table_id AND status = 'open';
  END IF;
  RETURN v_charge_id;
END;
$$;

REVOKE ALL ON FUNCTION public.post_room_charge_for_sale(uuid, uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.post_room_charge_for_sale(uuid, uuid, uuid, uuid) TO service_role;

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_method_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_method_check
  CHECK (method IN ('cash','telebirr','cbe_birr','coop_bank','awash_bank','dashen_bank','bank_transfer','credit','room_charge'));
