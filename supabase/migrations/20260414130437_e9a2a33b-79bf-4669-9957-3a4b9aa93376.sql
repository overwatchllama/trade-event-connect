-- Remove the overly permissive public SELECT policy on venue_claims
DROP POLICY IF EXISTS "Anyone can view venue claims" ON public.venue_claims;
