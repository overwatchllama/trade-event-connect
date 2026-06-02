
-- Drop old status check constraint so we can consolidate stages.
ALTER TABLE public.deal_list_items
  DROP CONSTRAINT IF EXISTS deal_list_items_status_check;

-- Consolidate existing 'watching'/'negotiating' rows into the new 'lead' stage.
UPDATE public.deal_list_items
SET status = 'lead'
WHERE status IN ('watching', 'negotiating');

-- Re-add the check constraint with the new pipeline stages.
ALTER TABLE public.deal_list_items
  ADD CONSTRAINT deal_list_items_status_check
  CHECK (status IN ('lead', 'bought', 'in_stock', 'sold', 'completed', 'passed'));

-- Sale tracking columns (used when advancing Bought/In Stock -> Sold)
ALTER TABLE public.deal_list_items
  ADD COLUMN IF NOT EXISTS sold_price numeric,
  ADD COLUMN IF NOT EXISTS sold_at timestamptz,
  ADD COLUMN IF NOT EXISTS sold_channel text,
  ADD COLUMN IF NOT EXISTS sold_fees numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sold_shipping numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sold_buyer text,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

CREATE INDEX IF NOT EXISTS deal_list_items_user_status_idx
  ON public.deal_list_items (user_id, status);
