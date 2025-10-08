-- Add vendor_notes field to events table for event-wide vendor instructions
ALTER TABLE events ADD COLUMN vendor_notes TEXT;

-- Add file_url field to vendor_applications for storing payment receipts/documents
ALTER TABLE vendor_applications ADD COLUMN file_url TEXT;

-- Update storage policies for event-files bucket to allow organizers to upload vendor files
CREATE POLICY "Event organizers can upload vendor files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'event-files' 
  AND auth.uid() IN (
    SELECT organizer_id FROM events 
    WHERE id::text = (storage.foldername(name))[1]
  )
);