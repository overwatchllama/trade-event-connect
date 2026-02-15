
-- Vendor's private notes/ratings for organizers (mirrors organizer_vendor_notes pattern)
CREATE TABLE public.vendor_organizer_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  organizer_id uuid NOT NULL,
  private_rating integer CHECK (private_rating >= 1 AND private_rating <= 5),
  private_notes text,
  is_favorite boolean DEFAULT false,
  is_blacklisted boolean DEFAULT false,
  blacklist_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(vendor_id, organizer_id)
);

ALTER TABLE public.vendor_organizer_notes ENABLE ROW LEVEL SECURITY;

-- Vendors can only see their own notes
CREATE POLICY "Vendors can view their own organizer notes"
  ON public.vendor_organizer_notes FOR SELECT
  USING (is_vendor_owner(vendor_id));

CREATE POLICY "Vendors can insert their own organizer notes"
  ON public.vendor_organizer_notes FOR INSERT
  WITH CHECK (is_vendor_owner(vendor_id));

CREATE POLICY "Vendors can update their own organizer notes"
  ON public.vendor_organizer_notes FOR UPDATE
  USING (is_vendor_owner(vendor_id));

CREATE POLICY "Vendors can delete their own organizer notes"
  ON public.vendor_organizer_notes FOR DELETE
  USING (is_vendor_owner(vendor_id));

-- Auto-update timestamp
CREATE TRIGGER update_vendor_organizer_notes_updated_at
  BEFORE UPDATE ON public.vendor_organizer_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
