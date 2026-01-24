-- Allow public viewing of profiles for users who are vendors
-- This is needed so the vendors page can display vendor information
CREATE POLICY "Public can view vendor profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM vendors WHERE vendors.user_id = profiles.id
  )
);