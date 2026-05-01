ALTER TABLE public.deal_list_items
ADD COLUMN IF NOT EXISTS price_override NUMERIC NULL;

COMMENT ON COLUMN public.deal_list_items.price_override IS
  'User-entered per-card price that overrides the condition-adjusted TCGplayer market price. NULL means use the auto-derived price.';