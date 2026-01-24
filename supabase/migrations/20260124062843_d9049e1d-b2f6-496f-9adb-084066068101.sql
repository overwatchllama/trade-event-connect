-- Add favorite and blacklist columns to organizer_vendor_notes table
ALTER TABLE public.organizer_vendor_notes 
ADD COLUMN IF NOT EXISTS is_favorite boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_blacklisted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS blacklist_reason text,
ADD COLUMN IF NOT EXISTS custom_list text;