-- Allow authenticated clients to read FIFO layers for inventory valuation.
-- The existing business-scoped RLS policy continues to control visible rows.
GRANT SELECT ON TABLE public.inventory_cost_layers TO authenticated;
