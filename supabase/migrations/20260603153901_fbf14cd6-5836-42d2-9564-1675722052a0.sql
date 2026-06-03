
-- Deal Proposals: vendor-authored shareable trade proposals
CREATE TABLE public.deal_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Deal Proposal',
  customer_name text,
  notes text,
  status text NOT NULL DEFAULT 'draft', -- draft | proposed | accepted | declined | completed
  public_token text NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(12), 'hex'),
  proposed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.deal_proposals TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deal_proposals TO authenticated;
GRANT ALL ON public.deal_proposals TO service_role;

ALTER TABLE public.deal_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendor manages own proposals"
  ON public.deal_proposals FOR ALL
  USING (auth.uid() = vendor_id)
  WITH CHECK (auth.uid() = vendor_id);

CREATE POLICY "Public can view shared proposals"
  ON public.deal_proposals FOR SELECT
  USING (status <> 'draft');

CREATE TRIGGER deal_proposals_updated_at
  BEFORE UPDATE ON public.deal_proposals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Line items: each row is a single input or output entry
CREATE TABLE public.deal_proposal_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.deal_proposals(id) ON DELETE CASCADE,
  side text NOT NULL, -- 'input' (customer gives vendor) | 'output' (vendor gives customer)
  kind text NOT NULL, -- 'cash' | 'card' | 'store_credit'
  amount numeric,     -- for cash / store_credit
  card_name text,
  set_name text,
  card_number text,
  condition text,
  quantity integer NOT NULL DEFAULT 1,
  unit_value numeric, -- per-card value
  image_url text,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT deal_proposal_lines_side_chk CHECK (side IN ('input','output')),
  CONSTRAINT deal_proposal_lines_kind_chk CHECK (kind IN ('cash','card','store_credit')),
  CONSTRAINT deal_proposal_lines_output_kind_chk CHECK (
    side = 'input' AND kind IN ('cash','card')
    OR side = 'output' AND kind IN ('cash','card','store_credit')
  )
);

CREATE INDEX deal_proposal_lines_proposal_idx ON public.deal_proposal_lines(proposal_id);

GRANT SELECT ON public.deal_proposal_lines TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deal_proposal_lines TO authenticated;
GRANT ALL ON public.deal_proposal_lines TO service_role;

ALTER TABLE public.deal_proposal_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendor manages own proposal lines"
  ON public.deal_proposal_lines FOR ALL
  USING (EXISTS (SELECT 1 FROM public.deal_proposals p WHERE p.id = proposal_id AND p.vendor_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.deal_proposals p WHERE p.id = proposal_id AND p.vendor_id = auth.uid()));

CREATE POLICY "Public can view lines of shared proposals"
  ON public.deal_proposal_lines FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.deal_proposals p WHERE p.id = proposal_id AND p.status <> 'draft'));

CREATE TRIGGER deal_proposal_lines_updated_at
  BEFORE UPDATE ON public.deal_proposal_lines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
