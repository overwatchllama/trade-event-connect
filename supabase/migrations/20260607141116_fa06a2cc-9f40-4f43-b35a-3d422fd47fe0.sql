
-- transactions
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('buy','sell','trade')),
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  personal_event_id uuid REFERENCES public.vendor_personal_events(id) ON DELETE SET NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  customer_label text,
  payment_method text,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  fees numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors manage own transactions"
ON public.transactions FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_transactions_user_occurred ON public.transactions(user_id, occurred_at DESC);
CREATE INDEX idx_transactions_event ON public.transactions(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX idx_transactions_personal_event ON public.transactions(personal_event_id) WHERE personal_event_id IS NOT NULL;

CREATE TRIGGER trg_transactions_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- transaction_items
CREATE TABLE public.transaction_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  side text NOT NULL DEFAULT 'sell' CHECK (side IN ('buy','sell')),
  card_name text NOT NULL,
  set_name text,
  card_number text,
  condition text,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_cost numeric(12,2),
  unit_price numeric(12,2),
  market_snapshot numeric(12,2),
  deal_list_item_id uuid REFERENCES public.deal_list_items(id) ON DELETE SET NULL,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.transaction_items TO authenticated;
GRANT ALL ON public.transaction_items TO service_role;

ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors manage own transaction items"
ON public.transaction_items FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.transactions t WHERE t.id = transaction_id AND t.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.transactions t WHERE t.id = transaction_id AND t.user_id = auth.uid()));

CREATE INDEX idx_transaction_items_tx ON public.transaction_items(transaction_id);
CREATE INDEX idx_transaction_items_deal_link ON public.transaction_items(deal_list_item_id) WHERE deal_list_item_id IS NOT NULL;

-- P&L rollup RPC
CREATE OR REPLACE FUNCTION public.get_event_pnl(
  p_event_id uuid DEFAULT NULL,
  p_personal_event_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_revenue numeric(12,2) := 0;
  v_cogs numeric(12,2) := 0;
  v_buys numeric(12,2) := 0;
  v_fees numeric(12,2) := 0;
  v_tx_count integer := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT
    COALESCE(SUM(CASE WHEN ti.side = 'sell' THEN ti.unit_price * ti.quantity ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN ti.side = 'sell' THEN COALESCE(ti.unit_cost, 0) * ti.quantity ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN ti.side = 'buy'  THEN COALESCE(ti.unit_cost, 0) * ti.quantity ELSE 0 END), 0)
  INTO v_revenue, v_cogs, v_buys
  FROM public.transactions t
  JOIN public.transaction_items ti ON ti.transaction_id = t.id
  WHERE t.user_id = v_uid
    AND (p_event_id IS NULL OR t.event_id = p_event_id)
    AND (p_personal_event_id IS NULL OR t.personal_event_id = p_personal_event_id);

  SELECT COALESCE(SUM(fees), 0), COUNT(*)
  INTO v_fees, v_tx_count
  FROM public.transactions t
  WHERE t.user_id = v_uid
    AND (p_event_id IS NULL OR t.event_id = p_event_id)
    AND (p_personal_event_id IS NULL OR t.personal_event_id = p_personal_event_id);

  RETURN jsonb_build_object(
    'revenue', v_revenue,
    'cogs', v_cogs,
    'buys', v_buys,
    'fees', v_fees,
    'net', v_revenue - v_cogs - v_fees,
    'tx_count', v_tx_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_event_pnl(uuid, uuid) TO authenticated;
