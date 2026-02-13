
-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can upload event flyers" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update event flyers" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view event flyers" ON storage.objects;

-- Create policies explicitly for authenticated users
CREATE POLICY "Authenticated users can upload event flyers"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'event-flyers' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update event flyers"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'event-flyers' AND auth.uid() IS NOT NULL);

-- Ensure public read access
CREATE POLICY "Anyone can view event flyers"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'event-flyers');
