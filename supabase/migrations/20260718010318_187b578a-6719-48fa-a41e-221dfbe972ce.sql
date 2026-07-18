
-- 1. transactions.status
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'completed'
    CHECK (status IN ('open','proposed','completed','void'));

CREATE INDEX IF NOT EXISTS idx_transactions_user_status ON public.transactions(user_id, status);

-- 2. Inventory state view (buyer-safe subset already exists as public_deal_list_items; this is vendor-side)
CREATE OR REPLACE VIEW public.v_inventory_state AS
SELECT
  d.id,
  d.user_id,
  d.card_name,
  d.set_name,
  d.card_number,
  d.condition,
  d.quantity,
  d.lot_id,
  d.status AS pipeline_status,
  d.listing_status,
  CASE
    WHEN d.sold_channel = 'trade' THEN 'traded'
    WHEN d.listing_status = 'sold' THEN 'sold'
    WHEN d.listing_status = 'for_sale' THEN 'listed'
    WHEN d.status = 'bought' THEN 'on_hand'
    ELSE COALESCE(d.status, 'unknown')
  END AS state,
  d.purchase_price,
  d.shipping_cost,
  d.fees,
  d.target_sell_price,
  d.list_price,
  d.sold_price,
  d.sold_at,
  d.tcgplayer_market_price,
  d.image_url,
  d.bought_at
FROM public.deal_list_items d;

GRANT SELECT ON public.v_inventory_state TO authenticated;
GRANT SELECT ON public.v_inventory_state TO service_role;

-- 3. commit_ticket RPC — one-shot save
CREATE OR REPLACE FUNCTION public.commit_ticket(p_ticket jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_kind text := COALESCE(p_ticket->>'kind', 'sale');
  v_status text := COALESCE(p_ticket->>'status', 'completed');
  v_txn_id uuid;
  v_lot_id uuid;
  v_line jsonb;
  v_dli_id uuid;
  v_subtotal numeric(12,2) := 0;
  v_fees numeric(12,2) := COALESCE((p_ticket->>'fees')::numeric, 0);
  v_lines_out jsonb := '[]'::jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF v_kind NOT IN ('sale','purchase','trade') THEN RAISE EXCEPTION 'Invalid kind %', v_kind; END IF;

  -- Optional lot header for purchases
  IF v_kind = 'purchase' AND (p_ticket->'lot') IS NOT NULL THEN
    INSERT INTO public.purchase_lots(
      user_id, title, source, lot_total, shipping_cost, fees,
      allocation_method, event_id, personal_event_id, notes
    ) VALUES (
      v_uid,
      p_ticket->'lot'->>'title',
      p_ticket->'lot'->>'source',
      COALESCE((p_ticket->'lot'->>'lot_total')::numeric, 0),
      COALESCE((p_ticket->'lot'->>'shipping_cost')::numeric, 0),
      COALESCE((p_ticket->'lot'->>'fees')::numeric, 0),
      COALESCE(p_ticket->'lot'->>'allocation_method', 'per_line'),
      NULLIF(p_ticket->'lot'->>'event_id','')::uuid,
      NULLIF(p_ticket->'lot'->>'personal_event_id','')::uuid,
      p_ticket->'lot'->>'notes'
    ) RETURNING id INTO v_lot_id;
  END IF;

  -- Subtotal from sell lines
  SELECT COALESCE(SUM(
    COALESCE((l->>'unit_price')::numeric,0) * COALESCE((l->>'quantity')::int,1)
  ), 0)
  INTO v_subtotal
  FROM jsonb_array_elements(COALESCE(p_ticket->'lines','[]'::jsonb)) l
  WHERE l->>'side' = 'sell';

  INSERT INTO public.transactions(
    user_id, kind, status, event_id, personal_event_id,
    customer_label, payment_method, subtotal, fees, total,
    notes, tender_breakdown
  ) VALUES (
    v_uid, v_kind, v_status,
    NULLIF(p_ticket->>'event_id','')::uuid,
    NULLIF(p_ticket->>'personal_event_id','')::uuid,
    p_ticket->>'customer_label',
    p_ticket->>'payment_method',
    v_subtotal, v_fees, v_subtotal + v_fees,
    p_ticket->>'notes',
    COALESCE(p_ticket->'tender_breakdown', '[]'::jsonb)
  ) RETURNING id INTO v_txn_id;

  -- Insert lines + stamp inventory
  FOR v_line IN SELECT * FROM jsonb_array_elements(COALESCE(p_ticket->'lines','[]'::jsonb)) LOOP
    v_dli_id := NULLIF(v_line->>'deal_list_item_id','')::uuid;

    INSERT INTO public.transaction_items(
      transaction_id, side, card_name, set_name, card_number, condition,
      quantity, unit_cost, unit_price, market_snapshot,
      deal_list_item_id, image_url, linked_kind, collection_item_id
    ) VALUES (
      v_txn_id,
      COALESCE(v_line->>'side','sell'),
      v_line->>'card_name',
      v_line->>'set_name',
      v_line->>'card_number',
      v_line->>'condition',
      COALESCE((v_line->>'quantity')::int, 1),
      NULLIF(v_line->>'unit_cost','')::numeric,
      NULLIF(v_line->>'unit_price','')::numeric,
      NULLIF(v_line->>'market_snapshot','')::numeric,
      v_dli_id,
      v_line->>'image_url',
      v_line->>'linked_kind',
      NULLIF(v_line->>'collection_item_id','')::uuid
    );

    -- Sell / trade-out: mark linked inventory sold/traded (only when completing)
    IF v_status = 'completed' AND v_dli_id IS NOT NULL AND COALESCE(v_line->>'side','sell') = 'sell' THEN
      UPDATE public.deal_list_items
      SET listing_status = 'sold',
          sold_at = now(),
          sold_price = COALESCE((v_line->>'unit_price')::numeric, sold_price),
          sold_channel = CASE WHEN v_kind = 'trade' THEN 'trade' ELSE 'pos' END,
          updated_at = now()
      WHERE id = v_dli_id AND user_id = v_uid;
    END IF;
  END LOOP;

  -- For purchases, create new inventory rows from buy lines
  IF v_kind = 'purchase' AND v_status = 'completed' THEN
    FOR v_line IN SELECT * FROM jsonb_array_elements(COALESCE(p_ticket->'lines','[]'::jsonb)) LOOP
      IF COALESCE(v_line->>'side','sell') = 'buy' THEN
        INSERT INTO public.deal_list_items(
          user_id, game, card_name, set_name, card_number, condition,
          quantity, purchase_price, target_sell_price, tcgplayer_market_price,
          image_url, status, bought_at, source, lot_id
        ) VALUES (
          v_uid,
          COALESCE(v_line->>'game','pokemon'),
          v_line->>'card_name',
          v_line->>'set_name',
          v_line->>'card_number',
          COALESCE(v_line->>'condition','NM'),
          COALESCE((v_line->>'quantity')::int, 1),
          NULLIF(v_line->>'unit_cost','')::numeric,
          NULLIF(v_line->>'target_sell_price','')::numeric,
          NULLIF(v_line->>'market_snapshot','')::numeric,
          v_line->>'image_url',
          'bought',
          now(),
          COALESCE(p_ticket->>'source','desk'),
          v_lot_id
        );
      END IF;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'transaction_id', v_txn_id,
    'lot_id', v_lot_id,
    'subtotal', v_subtotal,
    'total', v_subtotal + v_fees
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.commit_ticket(jsonb) TO authenticated;
