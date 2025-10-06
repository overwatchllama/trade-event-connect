-- Create table for organizer's private vendor notes and reviews
CREATE TABLE public.organizer_vendor_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  private_notes text,
  private_rating integer CHECK (private_rating >= 1 AND private_rating <= 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organizer_id, vendor_id)
);

-- Enable RLS
ALTER TABLE public.organizer_vendor_notes ENABLE ROW LEVEL SECURITY;

-- Organizers can only see and manage their own notes
CREATE POLICY "Organizers can view their own vendor notes"
  ON public.organizer_vendor_notes
  FOR SELECT
  USING (auth.uid() = organizer_id);

CREATE POLICY "Organizers can insert their own vendor notes"
  ON public.organizer_vendor_notes
  FOR INSERT
  WITH CHECK (auth.uid() = organizer_id);

CREATE POLICY "Organizers can update their own vendor notes"
  ON public.organizer_vendor_notes
  FOR UPDATE
  USING (auth.uid() = organizer_id);

CREATE POLICY "Organizers can delete their own vendor notes"
  ON public.organizer_vendor_notes
  FOR DELETE
  USING (auth.uid() = organizer_id);

-- Create trigger for updated_at
CREATE TRIGGER update_organizer_vendor_notes_updated_at
  BEFORE UPDATE ON public.organizer_vendor_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();