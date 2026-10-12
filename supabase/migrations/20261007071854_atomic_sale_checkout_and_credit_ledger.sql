-- Commit the sale header, sale lines (and their FIFO/inventory trigger effects),
-- and tender rows as one transaction. The server route validates price proofs,
-- tenant/branch and derived amounts before invoking this service-only RPC.
ALTER TABLE public.sales
  ADD COLUMN payment_status text NOT NULL DEFAULT 'paid'
    CHECK (payment_status IN ('paid', 'partial', 'unpaid')),
  ADD COLUMN amount_paid numeric(12,2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  ADD COLUMN outstanding_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (outstanding_amount >= 0);

UPDATE public.sales s
SET amount_paid = LEAST(s.total_amount, COALESCE(p.paid, 0)),
    outstanding_amount = GREATEST(s.total_amount - COALESCE(p.paid, 0), 0),
    payment_status = CASE
      WHEN COALESCE(p.paid, 0) >= s.total_amount THEN 'paid'
      WHEN COALESCE(p.paid, 0) > 0 THEN 'partial'
      ELSE 'unpaid'
    END
FROM (SELECT s2.id, COALESCE(SUM(pay.amount) FILTER (WHERE pay.status = 'completed'), 0) AS paid
      FROM public.sales s2 LEFT JOIN public.payments pay ON pay.sale_id = s2.id GROUP BY s2.id) p
WHERE p.id = s.id;

ALTER TABLE public.sales
  ADD CONSTRAINT sales_amount_paid_not_over_total CHECK (amount_paid <= total_amount),
  ADD CONSTRAINT sales_outstanding_not_over_total CHECK (outstanding_amount <= total_amount);

CREATE TABLE public.credit_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key uuid NOT NULL UNIQUE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id),
  sale_id uuid NOT NULL REFERENCES public.sales(id),
  actor_id uuid NOT NULL REFERENCES public.profiles(id),
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  method text NOT NULL CHECK (method IN ('cash','telebirr','cbe_birr','coop_bank','awash_bank','dashen_bank','bank_transfer')),
  reference_no text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.credit_settlements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.credit_settlements FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.credit_settlements TO authenticated;
GRANT SELECT, INSERT ON public.credit_settlements TO service_role;
CREATE POLICY credit_settlements_business_read ON public.credit_settlements
  FOR SELECT TO authenticated USING (
    business_id = public.auth_business_id()
    AND branch_id = (SELECT p.branch_id FROM public.profiles p WHERE p.id = (SELECT auth.uid()))
    AND public.auth_has_any_role(ARRAY['owner', 'manager', 'cashier'])
  );

CREATE OR REPLACE FUNCTION public.commit_pos_sale(
  p_sale jsonb,
  p_items jsonb,
  p_payments jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_sale_id uuid := (p_sale->>'id')::uuid;
  v_business_id uuid := (p_sale->>'business_id')::uuid;
  v_branch_id uuid := (p_sale->>'branch_id')::uuid;
  v_existing public.sales%ROWTYPE;
  v_item_count integer;
  v_payment_count integer;
BEGIN
  IF v_sale_id IS NULL OR v_business_id IS NULL OR v_branch_id IS NULL
     OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0
     OR jsonb_typeof(p_payments) <> 'array' OR jsonb_array_length(p_payments) = 0 THEN
    RAISE EXCEPTION 'Invalid sale commit payload.';
  END IF;

  -- Serialize retries and concurrent requests that reuse a sale ID.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_sale_id::text, 0));

  SELECT * INTO v_existing FROM public.sales WHERE id = v_sale_id FOR UPDATE;
  IF FOUND THEN
    IF v_existing.business_id <> v_business_id
       OR v_existing.branch_id <> v_branch_id
       OR v_existing.cashier_id IS DISTINCT FROM (p_sale->>'cashier_id')::uuid THEN
      RAISE EXCEPTION 'Sale ID was already used with different transaction data.';
    END IF;
  ELSE
    INSERT INTO public.sales (
      id, offline_id, branch_id, business_id, cashier_id, shift_id,
      receipt_number, subtotal, discount_amount, tax_amount, tip_amount,
      total_amount, table_name, table_id, customer_name, customer_phone,
      status, is_offline_sync, created_at
    ) VALUES (
      v_sale_id, p_sale->>'offline_id', v_branch_id, v_business_id,
      (p_sale->>'cashier_id')::uuid, NULLIF(p_sale->>'shift_id', '')::uuid,
      p_sale->>'receipt_number', (p_sale->>'subtotal')::numeric,
      (p_sale->>'discount_amount')::numeric, (p_sale->>'tax_amount')::numeric,
      (p_sale->>'tip_amount')::numeric, (p_sale->>'total_amount')::numeric,
      p_sale->>'table_name', NULLIF(p_sale->>'table_id', '')::uuid,
      NULLIF(p_sale->>'customer_name', ''), NULLIF(p_sale->>'customer_phone', ''),
      'completed', true, (p_sale->>'created_at')::timestamptz
    );
  END IF;

  -- Protect catalog/tenant integrity again at the transaction boundary.
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_items) AS x(item)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = (x.item->>'product_id')::uuid
        AND p.business_id = v_business_id
        AND (p.branch_id IS NULL OR p.branch_id = v_branch_id)
        AND p.is_active = true AND p.deleted_at IS NULL
    )
  ) THEN
    RAISE EXCEPTION 'Sale contains a product outside the active business or branch.';
  END IF;

  INSERT INTO public.inventory (business_id, branch_id, product_id, quantity)
  SELECT v_business_id, v_branch_id, p.id, 0
  FROM public.products p
  JOIN (SELECT DISTINCT (x.item->>'product_id')::uuid product_id FROM jsonb_array_elements(p_items) AS x(item)) requested
    ON requested.product_id = p.id
  ON CONFLICT (branch_id, product_id) DO NOTHING;

  SELECT count(*) INTO v_item_count FROM public.sale_items WHERE sale_id = v_sale_id;
  SELECT count(*) INTO v_payment_count FROM public.payments WHERE sale_id = v_sale_id;
  IF v_existing.id IS NOT NULL AND v_item_count > 0 AND v_payment_count > 0
     AND v_existing.total_amount <> (p_sale->>'total_amount')::numeric THEN
    RAISE EXCEPTION 'Sale ID was already used with different transaction data.';
  END IF;
  -- Older sync versions could leave a header without all line/tender rows.
  -- Repair only those incomplete records inside this transaction.
  IF v_existing.id IS NOT NULL AND (v_item_count = 0 OR v_payment_count = 0) THEN
    UPDATE public.sales SET
      offline_id = p_sale->>'offline_id', receipt_number = p_sale->>'receipt_number',
      subtotal = (p_sale->>'subtotal')::numeric,
      discount_amount = (p_sale->>'discount_amount')::numeric,
      tax_amount = (p_sale->>'tax_amount')::numeric,
      tip_amount = (p_sale->>'tip_amount')::numeric,
      total_amount = (p_sale->>'total_amount')::numeric,
      table_name = p_sale->>'table_name', table_id = NULLIF(p_sale->>'table_id', '')::uuid,
      customer_name = NULLIF(p_sale->>'customer_name', ''),
      customer_phone = NULLIF(p_sale->>'customer_phone', ''),
      status = 'completed', created_at = (p_sale->>'created_at')::timestamptz
    WHERE id = v_sale_id;
  END IF;
  IF v_item_count = 0 THEN
    INSERT INTO public.sale_items (sale_id, product_id, product_name, quantity, unit_price, cost_price, discount)
    SELECT v_sale_id, (x.item->>'product_id')::uuid, x.item->>'product_name',
      (x.item->>'quantity')::numeric, (x.item->>'unit_price')::numeric,
      (x.item->>'cost_price')::numeric, (x.item->>'discount')::numeric
    FROM jsonb_array_elements(p_items) AS x(item);
  ELSE
    IF v_item_count <> jsonb_array_length(p_items) OR EXISTS (
      SELECT 1 FROM jsonb_array_elements(p_items) AS x(item)
      WHERE NOT EXISTS (
        SELECT 1 FROM public.sale_items si
        WHERE si.sale_id = v_sale_id
          AND si.product_id = (x.item->>'product_id')::uuid
          AND si.quantity = (x.item->>'quantity')::numeric
          AND si.unit_price = (x.item->>'unit_price')::numeric
          AND COALESCE(si.discount, 0) = (x.item->>'discount')::numeric
      )
    ) THEN
      RAISE EXCEPTION 'Sale ID was already used with different sale lines.';
    END IF;
  END IF;

  IF v_payment_count = 0 THEN
    INSERT INTO public.payments (sale_id, business_id, amount, method, reference_no, status, created_at)
    SELECT v_sale_id, v_business_id, (x.payment->>'amount')::numeric, x.payment->>'method',
      x.payment->>'reference_no', x.payment->>'status', (x.payment->>'created_at')::timestamptz
    FROM jsonb_array_elements(p_payments) AS x(payment);
  ELSE
    IF v_payment_count <> jsonb_array_length(p_payments) OR EXISTS (
      SELECT 1 FROM jsonb_array_elements(p_payments) AS x(payment)
      WHERE NOT EXISTS (
        SELECT 1 FROM public.payments pay
        WHERE pay.sale_id = v_sale_id
          AND pay.amount = (x.payment->>'amount')::numeric
          AND pay.method = x.payment->>'method'
          AND pay.status = x.payment->>'status'
          AND pay.reference_no IS NOT DISTINCT FROM NULLIF(x.payment->>'reference_no', '')
      )
    ) THEN
      RAISE EXCEPTION 'Sale ID was already used with different payment rows.';
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_payments) AS x(payment)
    WHERE x.payment->>'method' = 'credit'
  ) AND (NULLIF(p_sale->>'customer_name', '') IS NULL OR NULLIF(p_sale->>'customer_phone', '') IS NULL) THEN
    RAISE EXCEPTION 'Credit tenders require a debtor name and phone number.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_payments) AS x(payment)
    WHERE (x.payment->>'method' = 'credit' AND x.payment->>'status' <> 'pending')
       OR (x.payment->>'method' <> 'credit' AND x.payment->>'status' <> 'completed')
  ) THEN
    RAISE EXCEPTION 'Payment status does not match the tender type.';
  END IF;

  IF ABS((SELECT COALESCE(SUM(amount), 0) FROM public.payments WHERE sale_id = v_sale_id)
         - (p_sale->>'total_amount')::numeric) > 0.009 THEN
    RAISE EXCEPTION 'Payment allocations do not equal the completed sale total.';
  END IF;

  UPDATE public.sales s
  SET amount_paid = LEAST(s.total_amount, COALESCE((
        SELECT SUM(amount) FROM public.payments
        WHERE sale_id = v_sale_id AND status = 'completed'
      ), 0)),
      outstanding_amount = GREATEST(s.total_amount - COALESCE((
        SELECT SUM(amount) FROM public.payments
        WHERE sale_id = v_sale_id AND status = 'completed'
      ), 0), 0),
      payment_status = CASE
        WHEN COALESCE((SELECT SUM(amount) FROM public.payments WHERE sale_id = v_sale_id AND status = 'completed'), 0) >= s.total_amount THEN 'paid'
        WHEN COALESCE((SELECT SUM(amount) FROM public.payments WHERE sale_id = v_sale_id AND status = 'completed'), 0) > 0 THEN 'partial'
        ELSE 'unpaid'
      END
  WHERE s.id = v_sale_id;

  RETURN v_sale_id;
END;
$$;

REVOKE ALL ON FUNCTION public.commit_pos_sale(jsonb, jsonb, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.commit_pos_sale(jsonb, jsonb, jsonb)
  TO service_role;

CREATE OR REPLACE FUNCTION public.settle_credit_sale(
  p_business_id uuid,
  p_branch_id uuid,
  p_sale_id uuid,
  p_actor_id uuid,
  p_idempotency_key uuid,
  p_amount numeric,
  p_method text,
  p_reference_no text DEFAULT NULL
) RETURNS TABLE(amount_paid numeric, outstanding_amount numeric, payment_status text)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_sale public.sales%ROWTYPE;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_sale_id::text, 0));
  SELECT * INTO v_sale FROM public.sales
   WHERE id = p_sale_id AND business_id = p_business_id AND branch_id = p_branch_id
   FOR UPDATE;
  IF NOT FOUND OR v_sale.status <> 'completed' OR v_sale.customer_name IS NULL OR v_sale.customer_phone IS NULL THEN
    RAISE EXCEPTION 'Credit sale or debtor was not found.';
  END IF;

  IF EXISTS (SELECT 1 FROM public.credit_settlements
      WHERE idempotency_key = p_idempotency_key AND sale_id = p_sale_id
        AND business_id = p_business_id AND amount = p_amount) THEN
    RETURN QUERY SELECT v_sale.amount_paid, v_sale.outstanding_amount, v_sale.payment_status;
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM public.credit_settlements WHERE idempotency_key = p_idempotency_key) THEN
    RAISE EXCEPTION 'Settlement retry key was reused for another payment.';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > v_sale.outstanding_amount THEN
    RAISE EXCEPTION 'Settlement amount must be greater than zero and no more than the outstanding balance.';
  END IF;
  IF p_method NOT IN ('cash','telebirr','cbe_birr','coop_bank','awash_bank','dashen_bank','bank_transfer') THEN
    RAISE EXCEPTION 'Invalid credit settlement method.';
  END IF;

  INSERT INTO public.credit_settlements (
    idempotency_key, business_id, branch_id, sale_id, actor_id, amount, method, reference_no
  ) VALUES (p_idempotency_key, p_business_id, p_branch_id, p_sale_id, p_actor_id, p_amount, p_method, p_reference_no);
  INSERT INTO public.payments (sale_id, business_id, amount, method, reference_no, status)
    VALUES (p_sale_id, p_business_id, p_amount, p_method, p_reference_no, 'completed');
  UPDATE public.sales s SET
    amount_paid = s.amount_paid + p_amount,
    outstanding_amount = s.outstanding_amount - p_amount,
    payment_status = CASE WHEN s.outstanding_amount = p_amount THEN 'paid' ELSE 'partial' END
  WHERE s.id = p_sale_id
  RETURNING s.amount_paid, s.outstanding_amount, s.payment_status
    INTO amount_paid, outstanding_amount, payment_status;
  RETURN NEXT;
END;
$$;
REVOKE ALL ON FUNCTION public.settle_credit_sale(uuid, uuid, uuid, uuid, uuid, numeric, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_credit_sale(uuid, uuid, uuid, uuid, uuid, numeric, text, text)
  TO service_role;
