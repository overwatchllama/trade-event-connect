
-- Create table for event staff roles
CREATE TABLE public.event_staff_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  role_name text NOT NULL,
  required_count integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.event_staff_roles ENABLE ROW LEVEL SECURITY;

-- Anyone can view event staff roles (useful for vendors/staff to see what's needed)
CREATE POLICY "Anyone can view event staff roles"
ON public.event_staff_roles
FOR SELECT
USING (true);

-- Event organizers can manage staff roles for their events
CREATE POLICY "Organizers can manage their event staff roles"
ON public.event_staff_roles
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM events
    WHERE events.id = event_staff_roles.event_id
    AND events.organizer_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_event_staff_roles_updated_at
BEFORE UPDATE ON public.event_staff_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
