-- Add contact phone and preferred contact method to events table
ALTER TABLE public.events
ADD COLUMN contact_phone text,
ADD COLUMN preferred_contact_method text;