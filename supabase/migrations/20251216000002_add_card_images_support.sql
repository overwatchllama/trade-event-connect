-- Add Card Images Support for Graded Cards Migration
-- Supports multiple images per card (front, back, slab label)

-- Create card images table
CREATE TABLE public.card_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_item_id UUID NOT NULL REFERENCES public.collection_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_type TEXT NOT NULL CHECK (image_type IN ('front', 'back', 'slab', 'label', 'case', 'other')),
  storage_path TEXT NOT NULL, -- Path in Supabase Storage
  thumbnail_path TEXT, -- Thumbnail path for performance
  file_size BIGINT, -- Size in bytes
  mime_type TEXT,
  width INTEGER,
  height INTEGER,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB, -- Additional image metadata (EXIF, etc.)
  CONSTRAINT card_images_user_item_type_unique UNIQUE (collection_item_id, image_type)
);

-- Enable RLS
ALTER TABLE public.card_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own card images"
ON public.card_images
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can upload their own card images"
ON public.card_images
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own card images"
ON public.card_images
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own card images"
ON public.card_images
FOR DELETE
USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_card_images_item_id ON public.card_images(collection_item_id);
CREATE INDEX idx_card_images_user_id ON public.card_images(user_id);
CREATE INDEX idx_card_images_type ON public.card_images(image_type);

-- Add columns to collection_items for quick image reference
ALTER TABLE public.collection_items
  ADD COLUMN IF NOT EXISTS has_images BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS images_count INTEGER DEFAULT 0;

-- Function to update image counts
CREATE OR REPLACE FUNCTION public.update_card_image_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.collection_items
    SET
      has_images = TRUE,
      images_count = (
        SELECT COUNT(*)
        FROM public.card_images
        WHERE collection_item_id = NEW.collection_item_id
      )
    WHERE id = NEW.collection_item_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.collection_items
    SET
      has_images = (
        SELECT COUNT(*) > 0
        FROM public.card_images
        WHERE collection_item_id = OLD.collection_item_id
      ),
      images_count = (
        SELECT COUNT(*)
        FROM public.card_images
        WHERE collection_item_id = OLD.collection_item_id
      )
    WHERE id = OLD.collection_item_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update image counts
CREATE TRIGGER update_card_image_count_trigger
  AFTER INSERT OR DELETE ON public.card_images
  FOR EACH ROW
  EXECUTE FUNCTION public.update_card_image_count();

-- Storage bucket configuration (run this in Supabase dashboard or via CLI)
-- This creates a storage bucket for card images
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('card-images', 'card-images', true);

-- Storage policies (to be added via Supabase dashboard)
-- Allow authenticated users to upload their own images
-- Allow public read access for sharing

COMMENT ON TABLE public.card_images IS 'Stores images for collection items, especially graded/slabbed cards';
COMMENT ON COLUMN public.card_images.image_type IS 'Type of image: front, back, slab, label, case, other';
COMMENT ON COLUMN public.card_images.storage_path IS 'Full path in Supabase Storage bucket';
