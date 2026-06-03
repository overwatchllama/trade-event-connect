ALTER TABLE public.deal_list_items
  ADD COLUMN IF NOT EXISTS trade_dollar_override numeric(12,2);

COMMENT ON COLUMN public.deal_list_items.trade_dollar_override IS
  'Per-card discount in $ off the condition-adjusted market price. Mutually exclusive with trade_pct_override; when both are null the global discount applies.';