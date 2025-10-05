-- Add sponsor_tiers column to events table
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS sponsor_tiers TEXT;