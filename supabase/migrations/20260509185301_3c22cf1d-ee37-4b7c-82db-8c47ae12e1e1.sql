-- Deal lifecycle + cost basis fields on deal_list_items
ALTER TABLE public.deal_list_items
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'watching',
  ADD COLUMN IF NOT EXISTS purchase_price numeric,
  ADD COLUMN IF NOT EXISTS shipping_cost numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fees numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS target_sell_price numeric,
  ADD COLUMN IF NOT EXISTS bought_at timestamptz,
  ADD COLUMN IF NOT EXISTS passed_at timestamptz,
  ADD COLUMN IF NOT EXISTS collection_item_id uuid;

-- Constrain status to the four supported stages
ALTER TABLE public.deal_list_items
  DROP CONSTRAINT IF EXISTS deal_list_items_status_check;
ALTER TABLE public.deal_list_items
  ADD CONSTRAINT deal_list_items_status_check
  CHECK (status IN ('watching', 'negotiating', 'bought', 'passed'));

CREATE INDEX IF NOT EXISTS idx_deal_list_items_user_status
  ON public.deal_list_items (user_id, status);
