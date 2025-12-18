-- Add vendor_start_time to events table
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS vendor_start_time time without time zone;

-- Create organizer_saved_locations table for personal saved locations
CREATE TABLE public.organizer_saved_locations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organizer_id uuid NOT NULL,
  name text NOT NULL,
  venue text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  zip_code text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.organizer_saved_locations ENABLE ROW LEVEL SECURITY;

-- Organizers can manage their own saved locations
CREATE POLICY "Users can view their own saved locations"
ON public.organizer_saved_locations
FOR SELECT
USING (auth.uid() = organizer_id);

CREATE POLICY "Users can create their own saved locations"
ON public.organizer_saved_locations
FOR INSERT
WITH CHECK (auth.uid() = organizer_id);

CREATE POLICY "Users can update their own saved locations"
ON public.organizer_saved_locations
FOR UPDATE
USING (auth.uid() = organizer_id);

CREATE POLICY "Users can delete their own saved locations"
ON public.organizer_saved_locations
FOR DELETE
USING (auth.uid() = organizer_id);

-- Add trigger for updated_at
CREATE TRIGGER update_organizer_saved_locations_updated_at
BEFORE UPDATE ON public.organizer_saved_locations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();