
ALTER TABLE public.deal_proposals
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS declined_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS trade_lot_id uuid REFERENCES public.purchase_lots(id) ON DELETE SET NULL;

ALTER TABLE public.deal_proposal_lines
  ADD COLUMN IF NOT EXISTS deal_list_item_id uuid REFERENCES public.deal_list_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS deal_proposal_lines_dli_idx
  ON public.deal_proposal_lines(deal_list_item_id);
