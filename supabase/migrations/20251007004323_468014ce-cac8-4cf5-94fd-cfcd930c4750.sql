-- Add preferred contact method to events table
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS preferred_contact_method text;