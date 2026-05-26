-- Remove broad SELECT policy that allows listing the public event-flyers bucket.
-- Public reads still work via getPublicUrl (CDN bypasses RLS for public buckets).
-- Only file owners retain SELECT via storage API for management UIs.
DROP POLICY IF EXISTS "Anyone can view event flyers" ON storage.objects;

CREATE POLICY "Owners can view their event flyers"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'event-flyers'
  AND auth.uid()::text = (storage.foldername(name))[1]
);