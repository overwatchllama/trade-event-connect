-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Anyone can view sponsor applications" ON public.sponsor_applications;

-- Add admin access policy for viewing
CREATE POLICY "Admins can view all sponsor applications"
ON public.sponsor_applications
FOR SELECT
USING (is_admin());