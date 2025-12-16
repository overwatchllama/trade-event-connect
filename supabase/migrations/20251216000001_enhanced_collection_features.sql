-- Enhanced Collection Features Migration
-- This migration adds TCGCollector-like functionality

-- Create enums for card variants and grading
CREATE TYPE public.card_variant AS ENUM (
  'normal',
  'holo',
  'reverse_holo',
  'first_edition',
  'unlimited',
  'shadowless',
  'stamped',
  'prerelease',
  'promo',
  'full_art',
  'secret_rare',
  'rainbow_rare',
  'gold',
  'silver',
  'extended_art',
  'showcase',
  'borderless',
  'foil',
  'etched',
  'gilded'
);

CREATE TYPE public.grading_company AS ENUM (
  'psa',
  'bgs',
  'cgc',
  'sgc',
  'ace',
  'none'
);

-- TCG Sets table - stores metadata about card sets
CREATE TABLE public.tcg_sets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  external_id TEXT UNIQUE, -- ID from external API (e.g., Pokemon TCG API)
  game card_category NOT NULL,
  name TEXT NOT NULL,
  code TEXT,
  series TEXT,
  release_date DATE,
  total_cards INTEGER,
  printed_total INTEGER,
  logo_url TEXT,
  symbol_url TEXT,
  description TEXT,
  metadata JSONB, -- Store additional API-specific data
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT tcg_sets_external_id_game_unique UNIQUE (external_id, game)
);

-- TCG Cards table - stores individual card data from APIs
CREATE TABLE public.tcg_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  external_id TEXT UNIQUE, -- ID from external API
  tcg_set_id UUID REFERENCES public.tcg_sets(id) ON DELETE CASCADE,
  game card_category NOT NULL,
  name TEXT NOT NULL,
  number TEXT, -- Card number in set
  artist TEXT,
  rarity TEXT,
  types TEXT[], -- Card types (e.g., ['Fire', 'Dragon'])
  supertype TEXT, -- Pokemon, Trainer, Energy, etc.
  subtypes TEXT[],
  hp TEXT,
  retreat_cost INTEGER,
  converted_mana_cost INTEGER, -- For MTG
  power TEXT, -- For MTG
  toughness TEXT, -- For MTG
  image_url TEXT,
  image_url_hires TEXT,
  small_image_url TEXT,
  prices JSONB, -- Current market prices
  legalities JSONB, -- Format legalities
  abilities JSONB, -- Card abilities/attacks
  rules_text TEXT,
  flavor_text TEXT,
  metadata JSONB, -- Additional API-specific data
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enhanced collection_items table (adding new columns)
ALTER TABLE public.collection_items
  ADD COLUMN IF NOT EXISTS tcg_card_id UUID REFERENCES public.tcg_cards(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS variant card_variant DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS is_graded BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS grading_company grading_company DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS grade_score DECIMAL(3,1), -- e.g., 9.5
  ADD COLUMN IF NOT EXISTS cert_number TEXT, -- Certification number
  ADD COLUMN IF NOT EXISTS is_first_edition BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_shadowless BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS is_signed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tags TEXT[], -- User-defined tags
  ADD COLUMN IF NOT EXISTS location TEXT, -- Where card is stored
  ADD COLUMN IF NOT EXISTS for_trade BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS metadata JSONB; -- Additional flexible data

-- Wishlists table
CREATE TABLE public.wishlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tcg_card_id UUID REFERENCES public.tcg_cards(id) ON DELETE CASCADE,
  name TEXT, -- For manual entries
  set_name TEXT,
  card_number TEXT,
  variant card_variant DEFAULT 'normal',
  desired_condition card_condition,
  max_price DECIMAL(10,2),
  priority INTEGER DEFAULT 1, -- 1-5 scale
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Price history table
CREATE TABLE public.price_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tcg_card_id UUID NOT NULL REFERENCES public.tcg_cards(id) ON DELETE CASCADE,
  variant card_variant DEFAULT 'normal',
  condition card_condition,
  price DECIMAL(10,2) NOT NULL,
  source TEXT, -- e.g., 'tcgplayer', 'cardmarket', 'ebay'
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB
);

-- Set completion tracking (materialized view)
CREATE TABLE public.set_completion (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tcg_set_id UUID NOT NULL REFERENCES public.tcg_sets(id) ON DELETE CASCADE,
  total_cards INTEGER NOT NULL DEFAULT 0,
  owned_cards INTEGER NOT NULL DEFAULT 0,
  completion_percentage DECIMAL(5,2) DEFAULT 0,
  total_value DECIMAL(10,2) DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT set_completion_user_set_unique UNIQUE (user_id, tcg_set_id)
);

-- Enable RLS
ALTER TABLE public.tcg_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tcg_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.set_completion ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tcg_sets (public read)
CREATE POLICY "Anyone can view TCG sets"
ON public.tcg_sets
FOR SELECT
USING (true);

-- RLS Policies for tcg_cards (public read)
CREATE POLICY "Anyone can view TCG cards"
ON public.tcg_cards
FOR SELECT
USING (true);

-- RLS Policies for wishlists
CREATE POLICY "Users can view their own wishlists"
ON public.wishlists
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own wishlist items"
ON public.wishlists
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wishlist items"
ON public.wishlists
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own wishlist items"
ON public.wishlists
FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for price_history (public read)
CREATE POLICY "Anyone can view price history"
ON public.price_history
FOR SELECT
USING (true);

-- RLS Policies for set_completion
CREATE POLICY "Users can view their own set completion"
ON public.set_completion
FOR SELECT
USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_tcg_sets_updated_at
  BEFORE UPDATE ON public.tcg_sets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tcg_cards_updated_at
  BEFORE UPDATE ON public.tcg_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_wishlists_updated_at
  BEFORE UPDATE ON public.wishlists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_tcg_sets_game ON public.tcg_sets(game);
CREATE INDEX idx_tcg_sets_external_id ON public.tcg_sets(external_id);
CREATE INDEX idx_tcg_sets_release_date ON public.tcg_sets(release_date DESC);

CREATE INDEX idx_tcg_cards_game ON public.tcg_cards(game);
CREATE INDEX idx_tcg_cards_external_id ON public.tcg_cards(external_id);
CREATE INDEX idx_tcg_cards_set_id ON public.tcg_cards(tcg_set_id);
CREATE INDEX idx_tcg_cards_name ON public.tcg_cards(name);
CREATE INDEX idx_tcg_cards_rarity ON public.tcg_cards(rarity);

CREATE INDEX idx_collection_items_tcg_card_id ON public.collection_items(tcg_card_id);
CREATE INDEX idx_collection_items_variant ON public.collection_items(variant);
CREATE INDEX idx_collection_items_graded ON public.collection_items(is_graded);
CREATE INDEX idx_collection_items_for_trade ON public.collection_items(for_trade);

CREATE INDEX idx_wishlists_user_id ON public.wishlists(user_id);
CREATE INDEX idx_wishlists_tcg_card_id ON public.wishlists(tcg_card_id);

CREATE INDEX idx_price_history_tcg_card_id ON public.price_history(tcg_card_id);
CREATE INDEX idx_price_history_recorded_at ON public.price_history(recorded_at DESC);

CREATE INDEX idx_set_completion_user_id ON public.set_completion(user_id);
CREATE INDEX idx_set_completion_tcg_set_id ON public.set_completion(tcg_set_id);

-- Function to update set completion
CREATE OR REPLACE FUNCTION public.update_set_completion(p_user_id UUID, p_tcg_set_id UUID)
RETURNS VOID AS $$
DECLARE
  v_total_cards INTEGER;
  v_owned_cards INTEGER;
  v_completion DECIMAL(5,2);
  v_total_value DECIMAL(10,2);
BEGIN
  -- Get total cards in set
  SELECT total_cards INTO v_total_cards
  FROM public.tcg_sets
  WHERE id = p_tcg_set_id;

  -- Count owned cards in set
  SELECT COUNT(DISTINCT tc.number) INTO v_owned_cards
  FROM public.collection_items ci
  JOIN public.tcg_cards tc ON ci.tcg_card_id = tc.id
  WHERE ci.user_id = p_user_id
    AND tc.tcg_set_id = p_tcg_set_id;

  -- Calculate completion percentage
  IF v_total_cards > 0 THEN
    v_completion := (v_owned_cards::DECIMAL / v_total_cards::DECIMAL) * 100;
  ELSE
    v_completion := 0;
  END IF;

  -- Calculate total value
  SELECT COALESCE(SUM(ci.current_market_price * ci.quantity), 0) INTO v_total_value
  FROM public.collection_items ci
  JOIN public.tcg_cards tc ON ci.tcg_card_id = tc.id
  WHERE ci.user_id = p_user_id
    AND tc.tcg_set_id = p_tcg_set_id;

  -- Upsert completion record
  INSERT INTO public.set_completion (user_id, tcg_set_id, total_cards, owned_cards, completion_percentage, total_value, last_updated)
  VALUES (p_user_id, p_tcg_set_id, v_total_cards, v_owned_cards, v_completion, v_total_value, now())
  ON CONFLICT (user_id, tcg_set_id)
  DO UPDATE SET
    total_cards = v_total_cards,
    owned_cards = v_owned_cards,
    completion_percentage = v_completion,
    total_value = v_total_value,
    last_updated = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.update_set_completion TO authenticated;

-- Comments for documentation
COMMENT ON TABLE public.tcg_sets IS 'Stores metadata about TCG card sets from various games';
COMMENT ON TABLE public.tcg_cards IS 'Stores individual card data from TCG APIs';
COMMENT ON TABLE public.wishlists IS 'User wishlists for cards they want to acquire';
COMMENT ON TABLE public.price_history IS 'Historical pricing data for cards';
COMMENT ON TABLE public.set_completion IS 'Tracks user progress in completing sets';
