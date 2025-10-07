-- Drop all existing policies
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can add free roles to themselves" ON public.user_roles;
DROP POLICY IF EXISTS "Users can remove free roles from themselves" ON public.user_roles;

-- Allow users to view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id OR is_admin());

-- Allow users to add only FREE roles to themselves (not premium or admin)
CREATE POLICY "Users can add free roles to themselves"
ON public.user_roles
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND role IN ('vendor', 'organizer', 'sponsor', 'venue', 'user')
);

-- Allow users to remove only FREE roles from themselves
CREATE POLICY "Users can remove free roles from themselves"
ON public.user_roles
FOR DELETE
USING (
  auth.uid() = user_id 
  AND role IN ('vendor', 'organizer', 'sponsor', 'venue', 'user')
);

-- Admins can manage ALL roles including premium and admin roles
CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
USING (is_admin());