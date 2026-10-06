-- Hotel folio settlement is opt-in per business. Existing standalone
-- businesses remain unchanged and cannot accept ROOM_CHARGE transactions.
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS is_hotel_integrated boolean NOT NULL DEFAULT false;

-- Clients may read shared table orders, but all mutations must pass through
-- the authenticated server route, which verifies signed catalog prices first.
DROP POLICY IF EXISTS open_table_orders_insert ON public.open_table_orders;
DROP POLICY IF EXISTS open_table_orders_update ON public.open_table_orders;
DROP POLICY IF EXISTS open_table_orders_delete ON public.open_table_orders;
REVOKE INSERT, UPDATE, DELETE ON public.open_table_orders FROM authenticated;
GRANT SELECT ON public.open_table_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.open_table_orders TO service_role;
