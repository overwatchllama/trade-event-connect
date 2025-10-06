-- Create event_files table for file uploads by organizers and sponsors
CREATE TABLE IF NOT EXISTS public.event_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  description TEXT,
  is_signed BOOLEAN DEFAULT false,
  signed_at TIMESTAMP WITH TIME ZONE,
  signed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.event_files ENABLE ROW LEVEL SECURITY;

-- Event organizers can manage all files for their events
CREATE POLICY "Event organizers can manage their event files"
ON public.event_files
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = event_files.event_id
    AND events.organizer_id = auth.uid()
  )
);

-- Sponsors can view and upload files for events they sponsor
CREATE POLICY "Sponsors can manage files for their sponsored events"
ON public.event_files
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.event_sponsors
    WHERE event_sponsors.event_id = event_files.event_id
    AND event_sponsors.sponsor_id IN (
      SELECT id FROM public.sponsors WHERE user_id = auth.uid()
    )
  )
);

-- Create storage bucket for event files
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-files', 'event-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for event files
CREATE POLICY "Event organizers can upload files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'event-files' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Event organizers and sponsors can view files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'event-files' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Event organizers can update files"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'event-files' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Event organizers can delete files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'event-files' AND
  auth.uid() IS NOT NULL
);

-- Add trigger for updated_at
CREATE TRIGGER update_event_files_updated_at
BEFORE UPDATE ON public.event_files
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();