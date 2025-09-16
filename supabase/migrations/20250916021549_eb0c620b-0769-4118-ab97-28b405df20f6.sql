-- Add a flexible social_links column to store dynamic social media links
ALTER TABLE public.vendors 
ADD COLUMN social_links jsonb DEFAULT '[]'::jsonb;

-- Add a comment to explain the structure
COMMENT ON COLUMN public.vendors.social_links IS 'Array of social media links with structure: [{"platform": "Instagram", "url": "https://..."}]';