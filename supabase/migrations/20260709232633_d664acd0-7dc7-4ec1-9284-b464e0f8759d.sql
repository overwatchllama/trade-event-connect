CREATE OR REPLACE FUNCTION public.get_event_pnl(p_event_id uuid DEFAULT NULL::uuid, p_personal_event_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_revenue numeric(12,2) := 0;
  v_cogs numeric(12,2) := 0;
  v_buys numeric(12,2) := 0;
  v_fees numeric(12,2) := 0;
  v_tx_count integer := 0;
  v_by_kind jsonb := '{}'::jsonb;
  v_by_channel jsonb := '{}'::jsonb;
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

  -- Rollup by transaction kind (sale / purchase / trade)
  SELECT COALESCE(jsonb_object_agg(kind, payload), '{}'::jsonb)
    INTO v_by_kind
  FROM (
    SELECT
      COALESCE(t.kind, 'sale') AS kind,
      jsonb_build_object(
        'revenue', COALESCE(SUM(CASE WHEN ti.side = 'sell' THEN ti.unit_price * ti.quantity ELSE 0 END), 0),
        'cogs',    COALESCE(SUM(CASE WHEN ti.side = 'sell' THEN COALESCE(ti.unit_cost, 0) * ti.quantity ELSE 0 END), 0),
        'buys',    COALESCE(SUM(CASE WHEN ti.side = 'buy'  THEN COALESCE(ti.unit_cost, 0) * ti.quantity ELSE 0 END), 0),
        'fees',    COALESCE(MAX(t.fees), 0),
        'tx_count', COUNT(DISTINCT t.id)
      ) AS payload
    FROM public.transactions t
    LEFT JOIN public.transaction_items ti ON ti.transaction_id = t.id
    WHERE t.user_id = v_uid
      AND (p_event_id IS NULL OR t.event_id = p_event_id)
      AND (p_personal_event_id IS NULL OR t.personal_event_id = p_personal_event_id)
    GROUP BY COALESCE(t.kind, 'sale')
  ) k;

  -- Rollup by channel: pos (kind=sale), trade (kind=trade), online (kind=sale via non-pos sold_channel on linked deal)
  SELECT COALESCE(jsonb_object_agg(channel, payload), '{}'::jsonb)
    INTO v_by_channel
  FROM (
    SELECT
      CASE
        WHEN COALESCE(t.kind, 'sale') = 'trade' THEN 'trade'
        WHEN COALESCE(t.kind, 'sale') = 'purchase' THEN 'purchase'
        WHEN dli.sold_channel IS NOT NULL AND dli.sold_channel <> 'pos' THEN 'online'
        ELSE 'pos'
      END AS channel,
      jsonb_build_object(
        'revenue', COALESCE(SUM(CASE WHEN ti.side = 'sell' THEN ti.unit_price * ti.quantity ELSE 0 END), 0),
        'cogs',    COALESCE(SUM(CASE WHEN ti.side = 'sell' THEN COALESCE(ti.unit_cost, 0) * ti.quantity ELSE 0 END), 0),
        'buys',    COALESCE(SUM(CASE WHEN ti.side = 'buy'  THEN COALESCE(ti.unit_cost, 0) * ti.quantity ELSE 0 END), 0)
      ) AS payload
    FROM public.transactions t
    JOIN public.transaction_items ti ON ti.transaction_id = t.id
    LEFT JOIN public.deal_list_items dli ON dli.id = ti.deal_list_item_id
    WHERE t.user_id = v_uid
      AND (p_event_id IS NULL OR t.event_id = p_event_id)
      AND (p_personal_event_id IS NULL OR t.personal_event_id = p_personal_event_id)
    GROUP BY 1
  ) c;

  RETURN jsonb_build_object(
    'revenue', v_revenue,
    'cogs', v_cogs,
    'buys', v_buys,
    'fees', v_fees,
    'net', v_revenue - v_cogs - v_fees,
    'tx_count', v_tx_count,
    'by_kind', v_by_kind,
    'by_channel', v_by_channel
  );
END;
$function$;