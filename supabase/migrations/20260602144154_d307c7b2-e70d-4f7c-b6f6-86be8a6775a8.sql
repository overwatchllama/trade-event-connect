-- 1) Hide events.contact_email / contact_phone from anonymous visitors.
--    Authenticated users (organizers, vendors, attendees) keep full access.
REVOKE SELECT (contact_email, contact_phone) ON public.events FROM anon;

-- 2) Align the vendor-facing event-files storage SELECT policy with the
--    actual upload path. Files are stored at {event_id}/{timestamp}.ext or
--    {event_id}/{application_id}/{timestamp}.ext, never {event_id}/{user_id}/...,
--    so the previous folder[2]=auth.uid() check always failed and locked
--    approved+paid vendors out. Replace it with an event-membership check.
DROP POLICY IF EXISTS "Vendors view their own event files" ON storage.objects;

CREATE POLICY "Approved paid vendors view their event files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'event-files'
  AND EXISTS (
    SELECT 1
    FROM public.vendor_applications va
    WHERE va.user_id = auth.uid()
      AND va.application_status = 'approved'
      AND va.payment_status = 'paid'
      AND (va.event_id)::text = (storage.foldername(objects.name))[1]
  )
);