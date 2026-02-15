
-- Create vendor staff roster (mirrors organizer_staff_roster)
CREATE TABLE public.vendor_staff_roster (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  default_role text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create vendor staff roles (mirrors organizer_staff_roles)
CREATE TABLE public.vendor_staff_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  role_name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(vendor_id, role_name)
);

-- Enable RLS
ALTER TABLE public.vendor_staff_roster ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_staff_roles ENABLE ROW LEVEL SECURITY;

-- Vendor owners can manage their staff roster
CREATE POLICY "Vendor owners can manage their staff roster"
ON public.vendor_staff_roster FOR ALL
USING (is_vendor_owner(vendor_id))
WITH CHECK (is_vendor_owner(vendor_id));

-- Vendor managers can view staff roster
CREATE POLICY "Vendor managers can view staff roster"
ON public.vendor_staff_roster FOR SELECT
USING (is_vendor_manager(vendor_id));

-- Vendor owners can manage their staff roles
CREATE POLICY "Vendor owners can manage their staff roles"
ON public.vendor_staff_roles FOR ALL
USING (is_vendor_owner(vendor_id))
WITH CHECK (is_vendor_owner(vendor_id));

-- Vendor managers can view staff roles
CREATE POLICY "Vendor managers can view staff roles"
ON public.vendor_staff_roles FOR SELECT
USING (is_vendor_manager(vendor_id));

-- Triggers for updated_at
CREATE TRIGGER update_vendor_staff_roster_updated_at
BEFORE UPDATE ON public.vendor_staff_roster
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vendor_staff_roles_updated_at
BEFORE UPDATE ON public.vendor_staff_roles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
