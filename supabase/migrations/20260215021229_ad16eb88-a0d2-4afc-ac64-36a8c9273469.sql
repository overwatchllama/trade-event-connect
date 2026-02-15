
-- Table listings for vendors to sell/transfer tables to other vendors
CREATE TABLE public.vendor_table_listings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_application_id uuid NOT NULL REFERENCES public.vendor_applications(id),
  seller_vendor_id uuid NOT NULL REFERENCES public.vendors(id),
  seller_user_id uuid NOT NULL,
  event_id uuid NOT NULL REFERENCES public.events(id),
  tables_offered integer NOT NULL DEFAULT 1,
  price_per_table numeric,
  listing_type text NOT NULL DEFAULT 'public' CHECK (listing_type IN ('public', 'direct')),
  target_vendor_id uuid REFERENCES public.vendors(id),
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'pending', 'sold', 'cancelled')),
  buyer_vendor_id uuid REFERENCES public.vendors(id),
  buyer_user_id uuid,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.vendor_table_listings ENABLE ROW LEVEL SECURITY;

-- Anyone can view available public listings
CREATE POLICY "Anyone can view available public listings"
  ON public.vendor_table_listings FOR SELECT
  USING (listing_type = 'public' AND status = 'available');

-- Sellers can view their own listings
CREATE POLICY "Sellers can view their own listings"
  ON public.vendor_table_listings FOR SELECT
  USING (auth.uid() = seller_user_id);

-- Direct transfer targets can view listings directed at them
CREATE POLICY "Direct targets can view their listings"
  ON public.vendor_table_listings FOR SELECT
  USING (listing_type = 'direct' AND target_vendor_id IN (
    SELECT id FROM vendors WHERE user_id = auth.uid()
  ));

-- Buyers can view listings they purchased
CREATE POLICY "Buyers can view purchased listings"
  ON public.vendor_table_listings FOR SELECT
  USING (auth.uid() = buyer_user_id);

-- Sellers can create listings
CREATE POLICY "Sellers can create listings"
  ON public.vendor_table_listings FOR INSERT
  WITH CHECK (auth.uid() = seller_user_id);

-- Sellers can update their own listings
CREATE POLICY "Sellers can update their own listings"
  ON public.vendor_table_listings FOR UPDATE
  USING (auth.uid() = seller_user_id);

-- Buyers can update to claim a listing
CREATE POLICY "Buyers can claim listings"
  ON public.vendor_table_listings FOR UPDATE
  USING (status = 'available' AND (
    listing_type = 'public' OR 
    target_vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid())
  ));

-- Sellers can delete their available listings
CREATE POLICY "Sellers can delete available listings"
  ON public.vendor_table_listings FOR DELETE
  USING (auth.uid() = seller_user_id AND status = 'available');

-- Trigger for updated_at
CREATE TRIGGER update_vendor_table_listings_updated_at
  BEFORE UPDATE ON public.vendor_table_listings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Vendor ratings for events
CREATE TABLE public.vendor_event_ratings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id),
  user_id uuid NOT NULL,
  event_id uuid NOT NULL REFERENCES public.events(id),
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(vendor_id, event_id)
);

ALTER TABLE public.vendor_event_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors can view their own ratings"
  ON public.vendor_event_ratings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Vendors can create ratings"
  ON public.vendor_event_ratings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Vendors can update their own ratings"
  ON public.vendor_event_ratings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Vendors can delete their own ratings"
  ON public.vendor_event_ratings FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_vendor_event_ratings_updated_at
  BEFORE UPDATE ON public.vendor_event_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Vendor ratings for venues
CREATE TABLE public.vendor_venue_ratings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id),
  user_id uuid NOT NULL,
  venue_id uuid NOT NULL REFERENCES public.venues(id),
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(vendor_id, venue_id)
);

ALTER TABLE public.vendor_venue_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors can view their own venue ratings"
  ON public.vendor_venue_ratings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Vendors can create venue ratings"
  ON public.vendor_venue_ratings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Vendors can update their own venue ratings"
  ON public.vendor_venue_ratings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Vendors can delete their own venue ratings"
  ON public.vendor_venue_ratings FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_vendor_venue_ratings_updated_at
  BEFORE UPDATE ON public.vendor_venue_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
