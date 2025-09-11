-- Allow anyone to view vendor profiles
CREATE POLICY "Anyone can view vendor profiles" 
ON public.profiles 
FOR SELECT 
USING (role = 'vendor'::user_role);