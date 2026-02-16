
-- Table for vendor's personal/unlisted events (private to the vendor)
CREATE TABLE public.vendor_personal_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  date date NOT NULL,
  venue text,
  address text,
  city text,
  state text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vendor_personal_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own personal events"
  ON public.vendor_personal_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own personal events"
  ON public.vendor_personal_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own personal events"
  ON public.vendor_personal_events FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own personal events"
  ON public.vendor_personal_events FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_vendor_personal_events_updated_at
  BEFORE UPDATE ON public.vendor_personal_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
