-- Create storage bucket for card scan photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('card-scans', 'card-scans', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for card-scans bucket: users can manage their own folder
CREATE POLICY "Users can view their own card scans"
ON storage.objects FOR SELECT
USING (bucket_id = 'card-scans' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own card scans"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'card-scans' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own card scans"
ON storage.objects FOR UPDATE
USING (bucket_id = 'card-scans' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own card scans"
ON storage.objects FOR DELETE
USING (bucket_id = 'card-scans' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Deal list items table: persistent cross-device "deal list" before promoting to collection
CREATE TABLE public.deal_list_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  scan_image_url TEXT,
  game TEXT NOT NULL DEFAULT 'pokemon', -- 'pokemon' | 'onepiece'
  card_name TEXT NOT NULL,
  set_name TEXT,
  card_number TEXT,
  rarity TEXT,
  external_id TEXT, -- pokemontcg.io id or optcg card_set_id
  image_url TEXT,
  tcgplayer_market_price NUMERIC,
  tcgplayer_url TEXT,
  ebay_search_url TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  condition TEXT NOT NULL DEFAULT 'near_mint',
  notes TEXT,
  bbox JSONB, -- { x, y, w, h } in 0..1 normalized coords from detection
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.deal_list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own deal items"
ON public.deal_list_items FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users insert their own deal items"
ON public.deal_list_items FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update their own deal items"
ON public.deal_list_items FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users delete their own deal items"
ON public.deal_list_items FOR DELETE
USING (auth.uid() = user_id);

CREATE INDEX idx_deal_list_items_user ON public.deal_list_items(user_id, created_at DESC);

CREATE TRIGGER update_deal_list_items_updated_at
BEFORE UPDATE ON public.deal_list_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();