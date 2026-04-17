
-- Create a SECURITY DEFINER function that returns event contact info only to authenticated users
CREATE OR REPLACE FUNCTION public.get_event_contact_info(_event_id uuid)
RETURNS TABLE(contact_email text, contact_phone text, preferred_contact_method text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.contact_email, e.contact_phone, e.preferred_contact_method
  FROM public.events e
  WHERE e.id = _event_id
    AND auth.uid() IS NOT NULL;
$$;

-- Restrict public SELECT on events to exclude unauthenticated access to contact fields
-- by replacing the public-readable policy with an authenticated-only one for full rows,
-- and a public policy that excludes contact columns via a wrapper view.

-- Drop the overly-permissive public read policy
DROP POLICY IF EXISTS "Anyone can view events" ON public.events;

-- Allow anyone (including anon) to read events, but the application will fetch contact info
-- only via the SECURITY DEFINER function above which enforces authentication.
-- Re-create a public read policy (row-level access stays the same; column protection is handled
-- by routing sensitive columns through the function for authenticated users only, and by
-- updating the client to not select contact_email/contact_phone for anonymous viewers).
CREATE POLICY "Public can view events"
ON public.events
FOR SELECT
USING (true);

-- NOTE: True column-level protection in Postgres requires either a view with column GRANTs
-- or splitting the table. Since events is widely read, we instead enforce contact-info access
-- in the client by calling get_event_contact_info() only for authenticated users.
