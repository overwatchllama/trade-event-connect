-- Create venues table
CREATE TABLE public.venues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  owner_id UUID REFERENCES profiles(id),
  contact_email TEXT,
  contact_phone TEXT,
  website_url TEXT,
  capacity INTEGER,
  amenities TEXT[],
  image_url TEXT,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create venue claims table for vendors/organizers to claim venues
CREATE TABLE public.venue_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  claimer_id UUID NOT NULL REFERENCES profiles(id),
  claim_type TEXT NOT NULL CHECK (claim_type IN ('owner', 'manager', 'editor')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reason TEXT,
  claimed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES profiles(id)
);

-- Add venue_id column to events table
ALTER TABLE public.events ADD COLUMN venue_id UUID REFERENCES venues(id);

-- Enable RLS
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_claims ENABLE ROW LEVEL SECURITY;

-- RLS Policies for venues
CREATE POLICY "Anyone can view venues" 
ON public.venues FOR SELECT 
USING (true);

CREATE POLICY "Users can create venues" 
ON public.venues FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Venue owners and admins can update venues" 
ON public.venues FOR UPDATE 
USING (
  auth.uid() = owner_id OR 
  is_admin() OR
  EXISTS (
    SELECT 1 FROM venue_claims 
    WHERE venue_id = venues.id 
    AND claimer_id = auth.uid() 
    AND status = 'approved'
    AND claim_type IN ('owner', 'manager', 'editor')
  )
);

-- RLS Policies for venue claims
CREATE POLICY "Anyone can view venue claims" 
ON public.venue_claims FOR SELECT 
USING (true);

CREATE POLICY "Users can create venue claims" 
ON public.venue_claims FOR INSERT 
WITH CHECK (auth.uid() = claimer_id);

CREATE POLICY "Claimers and venue owners can update claims" 
ON public.venue_claims FOR UPDATE 
USING (
  auth.uid() = claimer_id OR 
  is_admin() OR
  EXISTS (
    SELECT 1 FROM venues 
    WHERE id = venue_claims.venue_id 
    AND owner_id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_venues_updated_at
BEFORE UPDATE ON public.venues
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_venues_city_state ON venues(city, state);
CREATE INDEX idx_venue_claims_venue_id ON venue_claims(venue_id);
CREATE INDEX idx_events_venue_id ON events(venue_id);