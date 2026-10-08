-- Keep the sale header, lines, tenders, FIFO/branch inventory effects, and
-- hotel folio posting inside one PostgreSQL transaction for room-charge sales.
CREATE OR REPLACE FUNCTION public.commit_pos_sale_with_room_charge(
  p_sale jsonb,
  p_items jsonb,
  p_payments jsonb,
  p_actor_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_sale_id uuid;
  v_business_id uuid := (p_sale->>'business_id')::uuid;
  v_branch_id uuid := (p_sale->>'branch_id')::uuid;
  v_cashier_id uuid := (p_sale->>'cashier_id')::uuid;
BEGIN
  IF p_actor_id IS NULL OR p_actor_id IS DISTINCT FROM v_cashier_id THEN
    RAISE EXCEPTION 'Room charge actor must own the cashier sale.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = v_business_id AND b.is_hotel_integrated = true
  ) THEN
    RAISE EXCEPTION 'Room charges are not enabled for this business.';
  END IF;

  v_sale_id := public.commit_pos_sale(p_sale, p_items, p_payments);
  PERFORM public.post_room_charge_for_sale(
    v_business_id,
    v_branch_id,
    v_sale_id,
    p_actor_id
  );

  RETURN v_sale_id;
END;
$$;

REVOKE ALL ON FUNCTION public.commit_pos_sale_with_room_charge(jsonb, jsonb, jsonb, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.commit_pos_sale_with_room_charge(jsonb, jsonb, jsonb, uuid)
  TO service_role;
