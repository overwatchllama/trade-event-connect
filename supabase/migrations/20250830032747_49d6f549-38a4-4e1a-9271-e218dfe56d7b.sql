-- Add new fields to profiles table for enhanced personal information
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birthday DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location_city TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location_state TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location_zip_code TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address_line1 TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address_line2 TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address_city TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address_state TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address_zip_code TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS social_instagram TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS social_twitter TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS social_facebook TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS social_linkedin TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS communications_enabled BOOLEAN DEFAULT true;