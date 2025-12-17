-- Create enum for employee roles
CREATE TYPE public.vendor_employee_role AS ENUM (
  'event_manager',
  'warehouse_manager', 
  'retail_manager',
  'orders_manager',
  'warehouse_staff',
  'retail_staff',
  'event_staff'
);

-- Create vendor employees table with invite code system
CREATE TABLE public.vendor_employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role vendor_employee_role NOT NULL DEFAULT 'event_staff',
  invite_code TEXT UNIQUE,
  invite_expires_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive')),
  hired_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(vendor_id, user_id)
);

-- Create table for assigning employees to events
CREATE TABLE public.vendor_employee_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.vendor_employees(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, event_id)
);

-- Create table for tracking employee hours
CREATE TABLE public.vendor_employee_hours (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.vendor_employees(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  clock_in TIMESTAMP WITH TIME ZONE,
  clock_out TIMESTAMP WITH TIME ZONE,
  manual_hours DECIMAL(5,2),
  entry_type TEXT NOT NULL DEFAULT 'clock' CHECK (entry_type IN ('clock', 'manual')),
  notes TEXT,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vendor_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_employee_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_employee_hours ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user owns a vendor
CREATE OR REPLACE FUNCTION public.is_vendor_owner(_vendor_id UUID, _user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.vendors
    WHERE id = _vendor_id AND user_id = _user_id
  )
$$;

-- Helper function to check if user is an employee of a vendor (manager level)
CREATE OR REPLACE FUNCTION public.is_vendor_manager(_vendor_id UUID, _user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.vendor_employees
    WHERE vendor_id = _vendor_id 
      AND user_id = _user_id 
      AND status = 'active'
      AND role IN ('event_manager', 'warehouse_manager', 'retail_manager', 'orders_manager')
  )
$$;

-- RLS Policies for vendor_employees
CREATE POLICY "Vendor owners can manage their employees"
ON public.vendor_employees
FOR ALL
USING (public.is_vendor_owner(vendor_id));

CREATE POLICY "Employees can view their own records"
ON public.vendor_employees
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can claim invite codes"
ON public.vendor_employees
FOR UPDATE
USING (invite_code IS NOT NULL AND user_id IS NULL)
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for vendor_employee_events
CREATE POLICY "Vendor owners can manage event assignments"
ON public.vendor_employee_events
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.vendor_employees ve
    WHERE ve.id = employee_id
    AND public.is_vendor_owner(ve.vendor_id)
  )
);

CREATE POLICY "Managers can manage event assignments"
ON public.vendor_employee_events
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.vendor_employees ve
    WHERE ve.id = employee_id
    AND public.is_vendor_manager(ve.vendor_id)
  )
);

CREATE POLICY "Employees can view their own event assignments"
ON public.vendor_employee_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.vendor_employees ve
    WHERE ve.id = employee_id AND ve.user_id = auth.uid()
  )
);

-- RLS Policies for vendor_employee_hours
CREATE POLICY "Vendor owners can manage all hours"
ON public.vendor_employee_hours
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.vendor_employees ve
    WHERE ve.id = employee_id
    AND public.is_vendor_owner(ve.vendor_id)
  )
);

CREATE POLICY "Managers can manage hours"
ON public.vendor_employee_hours
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.vendor_employees ve
    WHERE ve.id = employee_id
    AND public.is_vendor_manager(ve.vendor_id)
  )
);

CREATE POLICY "Employees can manage their own hours"
ON public.vendor_employee_hours
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.vendor_employees ve
    WHERE ve.id = employee_id AND ve.user_id = auth.uid()
  )
);

-- Triggers for updated_at
CREATE TRIGGER update_vendor_employees_updated_at
BEFORE UPDATE ON public.vendor_employees
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vendor_employee_events_updated_at
BEFORE UPDATE ON public.vendor_employee_events
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vendor_employee_hours_updated_at
BEFORE UPDATE ON public.vendor_employee_hours
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();