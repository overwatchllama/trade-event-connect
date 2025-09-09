-- Add banner image and social media fields to vendors table
ALTER TABLE vendors 
ADD COLUMN IF NOT EXISTS banner_url text,
ADD COLUMN IF NOT EXISTS social_instagram text,
ADD COLUMN IF NOT EXISTS social_twitter text,
ADD COLUMN IF NOT EXISTS social_facebook text,
ADD COLUMN IF NOT EXISTS social_linkedin text,
ADD COLUMN IF NOT EXISTS avatar_url text;