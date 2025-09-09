-- Add user status and blocking functionality
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'suspended'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS blocked_by UUID;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS block_reason TEXT;

-- Create security definer function to check if user has admin role
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id AND role = 'admin'
  );
$$;

-- Create security definer function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID DEFAULT auth.uid())
RETURNS user_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = user_id;
$$;

-- Update profiles RLS policies to allow admin access
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view profiles" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id OR public.is_admin());

-- Allow admins to update any profile
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update profiles" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id OR public.is_admin());

-- Allow admins to view all role requests
DROP POLICY IF EXISTS "Users can view their own role requests" ON public.role_requests;
CREATE POLICY "Users can view role requests" 
ON public.role_requests 
FOR SELECT 
USING (auth.uid() = user_id OR public.is_admin());

-- Allow admins to update role requests
CREATE POLICY "Admins can update role requests" 
ON public.role_requests 
FOR UPDATE 
USING (public.is_admin());

-- Create admin actions log table
CREATE TABLE IF NOT EXISTS public.admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.profiles(id),
  target_user_id UUID NOT NULL REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view admin actions" 
ON public.admin_actions 
FOR SELECT 
USING (public.is_admin());

CREATE POLICY "Admins can create admin actions" 
ON public.admin_actions 
FOR INSERT 
WITH CHECK (public.is_admin() AND auth.uid() = admin_id);