-- Create sponsor_applications table to track sponsor applications to events
CREATE TABLE IF NOT EXISTS public.sponsor_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  sponsor_id UUID NOT NULL REFERENCES public.sponsors(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  application_status TEXT NOT NULL DEFAULT 'pending' CHECK (application_status IN ('pending', 'approved', 'rejected', 'waitlist')),
  sponsorship_level TEXT DEFAULT 'standard',
  amount NUMERIC,
  benefits TEXT,
  application_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, sponsor_id)
);

-- Enable RLS
ALTER TABLE public.sponsor_applications ENABLE ROW LEVEL SECURITY;

-- Anyone can view sponsor applications
CREATE POLICY "Anyone can view sponsor applications"
  ON public.sponsor_applications
  FOR SELECT
  USING (true);

-- Sponsors can create their own applications
CREATE POLICY "Sponsors can create their own applications"
  ON public.sponsor_applications
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Sponsors can view their own applications
CREATE POLICY "Sponsors can view their own applications"
  ON public.sponsor_applications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Event organizers can update applications for their events
CREATE POLICY "Event organizers can update sponsor applications for their events"
  ON public.sponsor_applications
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = sponsor_applications.event_id
      AND events.organizer_id = auth.uid()
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_sponsor_applications_updated_at
  BEFORE UPDATE ON public.sponsor_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_sponsor_applications_event_id ON public.sponsor_applications(event_id);
CREATE INDEX idx_sponsor_applications_status ON public.sponsor_applications(application_status);