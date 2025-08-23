-- Create enums for collection categories
CREATE TYPE public.card_category AS ENUM ('pokemon', 'mtg', 'yugioh', 'sports', 'other');
CREATE TYPE public.card_condition AS ENUM ('mint', 'near_mint', 'excellent', 'good', 'light_play', 'moderate_play', 'heavy_play', 'damaged');

-- Create collections table
CREATE TABLE public.collections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category card_category NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create collection items table
CREATE TABLE public.collection_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  set_name TEXT,
  card_number TEXT,
  rarity TEXT,
  condition card_condition NOT NULL DEFAULT 'near_mint',
  quantity INTEGER NOT NULL DEFAULT 1,
  purchase_price DECIMAL(10,2),
  current_market_price DECIMAL(10,2),
  estimated_value DECIMAL(10,2),
  notes TEXT,
  image_url TEXT,
  acquired_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for collections
CREATE POLICY "Users can view their own collections" 
ON public.collections 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own collections" 
ON public.collections 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own collections" 
ON public.collections 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own collections" 
ON public.collections 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for collection_items
CREATE POLICY "Users can view their own collection items" 
ON public.collection_items 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own collection items" 
ON public.collection_items 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own collection items" 
ON public.collection_items 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own collection items" 
ON public.collection_items 
FOR DELETE 
USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_collections_updated_at
  BEFORE UPDATE ON public.collections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_collection_items_updated_at
  BEFORE UPDATE ON public.collection_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for better performance
CREATE INDEX idx_collections_user_id ON public.collections(user_id);
CREATE INDEX idx_collections_category ON public.collections(category);
CREATE INDEX idx_collection_items_user_id ON public.collection_items(user_id);
CREATE INDEX idx_collection_items_collection_id ON public.collection_items(collection_id);
CREATE INDEX idx_collection_items_name ON public.collection_items(name);
CREATE INDEX idx_collection_items_set_name ON public.collection_items(set_name);