-- Add social media and contact email fields to events table
ALTER TABLE public.events
ADD COLUMN social_instagram text,
ADD COLUMN social_x text,
ADD COLUMN social_tiktok text,
ADD COLUMN social_linktree text,
ADD COLUMN social_facebook text,
ADD COLUMN contact_email text;