
-- Catalog of cards we track
CREATE TABLE public.market_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game text NOT NULL CHECK (game IN ('pokemon','onepiece')),
  external_id text NOT NULL,
  name text NOT NULL,
  set_id text,
  set_name text,
  number text,
  rarity text,
  image_url text,
  tcgplayer_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game, external_id)
);

CREATE INDEX idx_market_cards_game ON public.market_cards(game);
CREATE INDEX idx_market_cards_set ON public.market_cards(set_name);
CREATE INDEX idx_market_cards_rarity ON public.market_cards(rarity);
CREATE INDEX idx_market_cards_name_lower ON public.market_cards(lower(name));

ALTER TABLE public.market_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view market cards"
  ON public.market_cards FOR SELECT
  USING (true);

-- Latest pricing/grading snapshot per card
CREATE TABLE public.market_snapshots (
  card_id uuid PRIMARY KEY REFERENCES public.market_cards(id) ON DELETE CASCADE,
  raw_price numeric,
  psa10_price numeric,
  psa10_ratio numeric,
  gem_rate numeric,
  psa_total_pop integer,
  psa10_pop integer,
  sample_size integer,
  last_refreshed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_market_snapshots_ratio ON public.market_snapshots(psa10_ratio DESC NULLS LAST);
CREATE INDEX idx_market_snapshots_gem_rate ON public.market_snapshots(gem_rate DESC NULLS LAST);
CREATE INDEX idx_market_snapshots_raw ON public.market_snapshots(raw_price);
CREATE INDEX idx_market_snapshots_psa10 ON public.market_snapshots(psa10_price DESC NULLS LAST);
CREATE INDEX idx_market_snapshots_refreshed ON public.market_snapshots(last_refreshed_at DESC);

ALTER TABLE public.market_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view market snapshots"
  ON public.market_snapshots FOR SELECT
  USING (true);

-- Background job audit log
CREATE TABLE public.market_refresh_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  game text,
  cards_upserted integer DEFAULT 0,
  snapshots_upserted integer DEFAULT 0,
  psa_lookups integer DEFAULT 0,
  errors integer DEFAULT 0,
  status text NOT NULL DEFAULT 'running',
  notes text
);

CREATE INDEX idx_market_refresh_runs_started ON public.market_refresh_runs(started_at DESC);

ALTER TABLE public.market_refresh_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view refresh runs"
  ON public.market_refresh_runs FOR SELECT
  USING (public.is_admin());

-- updated_at trigger for market_cards
CREATE TRIGGER update_market_cards_updated_at
  BEFORE UPDATE ON public.market_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
