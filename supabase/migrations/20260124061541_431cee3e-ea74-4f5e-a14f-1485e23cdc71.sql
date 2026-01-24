-- Add hide_from_calendar column to vendor_applications
ALTER TABLE public.vendor_applications 
ADD COLUMN IF NOT EXISTS hide_from_calendar boolean DEFAULT false;