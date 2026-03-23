
-- Fix overly permissive vendor_applications UPDATE policy
DROP POLICY IF EXISTS "Event organizers can update applications for their events" ON public.vendor_applications;
CREATE POLICY "Event organizers can update applications for their events"
ON public.vendor_applications
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1 FROM events
    WHERE events.id = vendor_applications.event_id
    AND events.organizer_id = auth.uid()
  )
);

-- Fix overly permissive vendor_applications SELECT policy
DROP POLICY IF EXISTS "Event organizers can view applications for their events" ON public.vendor_applications;
CREATE POLICY "Event organizers can view applications for their events"
ON public.vendor_applications
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM events
    WHERE events.id = vendor_applications.event_id
    AND events.organizer_id = auth.uid()
  )
);
