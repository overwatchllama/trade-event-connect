
-- Fix the security definer view warning - recreate as security invoker
DROP VIEW IF EXISTS public.public_vendor_profiles;

CREATE OR REPLACE VIEW public.public_vendor_profiles
WITH (security_invoker = true)
AS
SELECT 
  p.id,
  p.full_name,
  p.avatar_url,
  p.location_city,
  p.location_state
FROM public.profiles p
WHERE EXISTS (
  SELECT 1 FROM public.vendors v WHERE v.user_id = p.id
);

-- Grant access
GRANT SELECT ON public.public_vendor_profiles TO anon, authenticated;

-- We need an RLS policy on profiles that allows reading these specific columns
-- for vendor profiles. Since RLS is row-level not column-level, we use a 
-- security definer function instead.
CREATE OR REPLACE FUNCTION public.get_public_vendor_profiles(user_ids uuid[])
RETURNS TABLE (
  id uuid,
  full_name text,
  avatar_url text,
  location_city text,
  location_state text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.avatar_url, p.location_city, p.location_state
  FROM profiles p
  WHERE p.id = ANY(user_ids)
    AND EXISTS (SELECT 1 FROM vendors v WHERE v.user_id = p.id);
$$;
