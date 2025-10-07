-- Add vendor-like fields to sponsors table
ALTER TABLE public.sponsors 
  ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS banner_url TEXT,
  ADD COLUMN IF NOT EXISTS social_instagram TEXT,
  ADD COLUMN IF NOT EXISTS social_twitter TEXT,
  ADD COLUMN IF NOT EXISTS social_facebook TEXT,
  ADD COLUMN IF NOT EXISTS social_linkedin TEXT,
  ADD COLUMN IF NOT EXISTS company_address TEXT,
  ADD COLUMN IF NOT EXISTS specialties TEXT[];

-- Update existing sponsors to have default values
UPDATE public.sponsors 
SET 
  verified = COALESCE(verified, false),
  rating = COALESCE(rating, 0.0),
  total_reviews = COALESCE(total_reviews, 0)
WHERE verified IS NULL OR rating IS NULL OR total_reviews IS NULL;