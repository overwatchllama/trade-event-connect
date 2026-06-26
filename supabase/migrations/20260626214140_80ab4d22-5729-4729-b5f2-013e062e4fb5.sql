
-- 1) purchase_lots header table
CREATE TABLE IF NOT EXISTS public.purchase_lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text,
  source text,
  lot_total numeric(12,2) NOT NULL DEFAULT 0,
  shipping_cost numeric(12,2) NOT NULL DEFAULT 0,
  fees numeric(12,2) NOT NULL DEFAULT 0,
  allocation_method text NOT NULL DEFAULT 'market' CHECK (allocation_method IN ('market','target','even')),
  event_id uuid,
  personal_event_id uuid,
  notes text,
  bought_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_lots TO authenticated;
GRANT ALL ON public.purchase_lots TO service_role;

ALTER TABLE public.purchase_lots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their lots" ON public.purchase_lots
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER purchase_lots_updated_at
  BEFORE UPDATE ON public.purchase_lots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS purchase_lots_user_idx ON public.purchase_lots(user_id, bought_at DESC);

-- 2) deal_list_items.lot_id
ALTER TABLE public.deal_list_items
  ADD COLUMN IF NOT EXISTS lot_id uuid REFERENCES public.purchase_lots(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS deal_list_items_lot_idx ON public.deal_list_items(lot_id);

-- 3) transactions.kind + tender_breakdown
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'sale',
  ADD COLUMN IF NOT EXISTS tender_breakdown jsonb;

ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_kind_check;
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_kind_check CHECK (kind IN ('sale','purchase','trade'));

-- 4) transaction_items.linked_kind
ALTER TABLE public.transaction_items
  ADD COLUMN IF NOT EXISTS linked_kind text;

ALTER TABLE public.transaction_items
  DROP CONSTRAINT IF EXISTS transaction_items_linked_kind_check;
ALTER TABLE public.transaction_items
  ADD CONSTRAINT transaction_items_linked_kind_check
    CHECK (linked_kind IS NULL OR linked_kind IN ('deal_item','collection_item'));

ALTER TABLE public.transaction_items
  ADD COLUMN IF NOT EXISTS collection_item_id uuid REFERENCES public.collection_items(id) ON DELETE SET NULL;
