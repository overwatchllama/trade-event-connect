-- Create sponsors table
CREATE TABLE IF NOT EXISTS public.sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_name TEXT NOT NULL,
  company_description TEXT,
  logo_url TEXT,
  website_url TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create event_sponsors junction table
CREATE TABLE IF NOT EXISTS public.event_sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  sponsor_id UUID REFERENCES public.sponsors(id) ON DELETE CASCADE NOT NULL,
  sponsorship_level TEXT DEFAULT 'standard',
  amount DECIMAL(10,2),
  benefits TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, sponsor_id)
);

-- Enable RLS
ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_sponsors ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sponsors table
CREATE POLICY "Anyone can view sponsors"
  ON public.sponsors FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own sponsor profile"
  ON public.sponsors FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Sponsors can update their own profile"
  ON public.sponsors FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Sponsors can delete their own profile"
  ON public.sponsors FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for event_sponsors table
CREATE POLICY "Anyone can view event sponsors"
  ON public.event_sponsors FOR SELECT
  USING (true);

CREATE POLICY "Event organizers can add sponsors to their events"
  ON public.event_sponsors FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE id = event_id AND organizer_id = auth.uid()
    )
  );

CREATE POLICY "Event organizers can update sponsors on their events"
  ON public.event_sponsors FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE id = event_id AND organizer_id = auth.uid()
    )
  );

CREATE POLICY "Event organizers can remove sponsors from their events"
  ON public.event_sponsors FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE id = event_id AND organizer_id = auth.uid()
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_sponsors_updated_at
  BEFORE UPDATE ON public.sponsors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_sponsors_user_id ON public.sponsors(user_id);
CREATE INDEX idx_event_sponsors_event_id ON public.event_sponsors(event_id);
CREATE INDEX idx_event_sponsors_sponsor_id ON public.event_sponsors(sponsor_id);

COMMENT ON TABLE public.sponsors IS 'Stores sponsor company information';
COMMENT ON TABLE public.event_sponsors IS 'Links sponsors to events with sponsorship details';
