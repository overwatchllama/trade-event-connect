
-- ===========================================
-- FIX 1: Replace overly broad profiles policy with a secure view
-- ===========================================

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Public can view vendor profiles" ON public.profiles;

-- Create a secure view that only exposes safe public fields
CREATE OR REPLACE VIEW public.public_vendor_profiles
WITH (security_invoker = false)
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

-- Grant access to the view for anon and authenticated roles
GRANT SELECT ON public.public_vendor_profiles TO anon, authenticated;

-- ===========================================
-- FIX 2: Remove overly broad event-flyers storage policies
-- The organizer-scoped policies from earlier migration still exist
-- ===========================================

DROP POLICY IF EXISTS "Authenticated users can upload event flyers" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update event flyers" ON storage.objects;

-- ===========================================
-- FIX 3: Make event-files bucket private
-- ===========================================

UPDATE storage.buckets SET public = false WHERE id = 'event-files';
