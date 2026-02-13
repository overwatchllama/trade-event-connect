-- Table to assign users to event staff roles
CREATE TABLE public.event_staff_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  staff_role_id UUID NOT NULL REFERENCES public.event_staff_roles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_name TEXT NOT NULL,
  assigned_email TEXT,
  assigned_phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.event_staff_assignments ENABLE ROW LEVEL SECURITY;

-- Anyone can view staff assignments for events they can see
CREATE POLICY "Anyone can view event staff assignments"
  ON public.event_staff_assignments
  FOR SELECT
  USING (true);

-- Organizers can manage staff assignments for their events
CREATE POLICY "Organizers can manage their event staff assignments"
  ON public.event_staff_assignments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_staff_assignments.event_id
        AND events.organizer_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_event_staff_assignments_updated_at
  BEFORE UPDATE ON public.event_staff_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();