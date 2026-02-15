
-- Create a table for organizer's saved staff members (reusable roster)
CREATE TABLE public.organizer_staff_roster (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organizer_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  default_role TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.organizer_staff_roster ENABLE ROW LEVEL SECURITY;

-- Organizers can manage their own roster
CREATE POLICY "Organizers can view their own staff roster"
ON public.organizer_staff_roster
FOR SELECT
USING (auth.uid() = organizer_id);

CREATE POLICY "Organizers can insert their own staff roster"
ON public.organizer_staff_roster
FOR INSERT
WITH CHECK (auth.uid() = organizer_id);

CREATE POLICY "Organizers can update their own staff roster"
ON public.organizer_staff_roster
FOR UPDATE
USING (auth.uid() = organizer_id);

CREATE POLICY "Organizers can delete their own staff roster"
ON public.organizer_staff_roster
FOR DELETE
USING (auth.uid() = organizer_id);

-- Create a table for organizer's saved/reusable staff roles
CREATE TABLE public.organizer_staff_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organizer_id UUID NOT NULL,
  role_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organizer_id, role_name)
);

-- Enable RLS
ALTER TABLE public.organizer_staff_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers can view their own staff roles"
ON public.organizer_staff_roles
FOR SELECT
USING (auth.uid() = organizer_id);

CREATE POLICY "Organizers can insert their own staff roles"
ON public.organizer_staff_roles
FOR INSERT
WITH CHECK (auth.uid() = organizer_id);

CREATE POLICY "Organizers can update their own staff roles"
ON public.organizer_staff_roles
FOR UPDATE
USING (auth.uid() = organizer_id);

CREATE POLICY "Organizers can delete their own staff roles"
ON public.organizer_staff_roles
FOR DELETE
USING (auth.uid() = organizer_id);

-- Triggers for updated_at
CREATE TRIGGER update_organizer_staff_roster_updated_at
BEFORE UPDATE ON public.organizer_staff_roster
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organizer_staff_roles_updated_at
BEFORE UPDATE ON public.organizer_staff_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
