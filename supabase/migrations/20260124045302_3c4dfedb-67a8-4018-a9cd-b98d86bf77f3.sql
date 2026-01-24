-- Security Fix 1: Add authorization check to update_set_completion function
-- Prevents any authenticated user from manipulating other users' collection stats
CREATE OR REPLACE FUNCTION public.update_set_completion(p_user_id UUID, p_tcg_set_id UUID)
RETURNS VOID AS $$
DECLARE
  v_total_in_set INTEGER;
  v_owned_count INTEGER;
  v_completion_percentage NUMERIC(5,2);
BEGIN
  -- SECURITY FIX: Ensure caller can only update their own data
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Can only update own collection completion';
  END IF;

  -- Count total cards in the set (this would need to be tracked or estimated)
  -- For now, count owned cards in this set
  SELECT COUNT(*), SUM(quantity)
  INTO v_total_in_set, v_owned_count
  FROM collection_items ci
  JOIN collections c ON ci.collection_id = c.id
  WHERE c.user_id = p_user_id
    AND ci.set_name = (SELECT name FROM tcg_sets WHERE id = p_tcg_set_id LIMIT 1);
  
  -- Calculate completion percentage (simplified - assumes owned = set size)
  v_completion_percentage := COALESCE(
    (v_owned_count::NUMERIC / NULLIF(v_total_in_set, 0)) * 100, 
    0
  );
  
  -- Update or insert set completion record
  INSERT INTO user_set_completions (user_id, tcg_set_id, owned_count, completion_percentage)
  VALUES (p_user_id, p_tcg_set_id, COALESCE(v_owned_count, 0), v_completion_percentage)
  ON CONFLICT (user_id, tcg_set_id) 
  DO UPDATE SET 
    owned_count = COALESCE(v_owned_count, 0),
    completion_percentage = v_completion_percentage,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- Security Fix 2: Remove public access to vendor profiles (exposes PII)
-- The vendors table already has appropriate public business info
DROP POLICY IF EXISTS "Anyone can view vendor profiles" ON public.profiles;


-- Security Fix 3: Fix event-files storage policies to check event ownership
-- Drop overly permissive policies
DROP POLICY IF EXISTS "Event organizers can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Event organizers and sponsors can view files" ON storage.objects;
DROP POLICY IF EXISTS "Event organizers can update files" ON storage.objects;
DROP POLICY IF EXISTS "Event organizers can delete files" ON storage.objects;

-- Create properly scoped policies - files are stored as: event_id/filename or event_id/subfolder/filename
-- Using text comparison since storage.foldername returns text array

-- INSERT: Only event organizers can upload files to their own event folders
CREATE POLICY "Event organizers can upload files to their events"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'event-files' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM events 
    WHERE events.organizer_id = auth.uid() 
    AND events.id::text = (storage.foldername(name))[1]
  )
);

-- SELECT: Event organizers and sponsors can view event files
CREATE POLICY "Event organizers and sponsors can view event files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'event-files' AND
  auth.uid() IS NOT NULL AND
  (
    -- Event organizers can view their event files
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.organizer_id = auth.uid() 
      AND events.id::text = (storage.foldername(name))[1]
    )
    OR
    -- Sponsors of the event can view files
    EXISTS (
      SELECT 1 FROM event_sponsors es
      JOIN sponsors s ON s.id = es.sponsor_id
      WHERE s.user_id = auth.uid()
      AND es.event_id::text = (storage.foldername(name))[1]
    )
    OR
    -- Vendors with approved applications can view files for events they're approved for
    EXISTS (
      SELECT 1 FROM vendor_applications va
      WHERE va.user_id = auth.uid()
      AND va.application_status = 'approved'
      AND va.event_id::text = (storage.foldername(name))[1]
    )
  )
);

-- UPDATE: Only event organizers can update their event files
CREATE POLICY "Event organizers can update their event files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'event-files' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM events 
    WHERE events.organizer_id = auth.uid() 
    AND events.id::text = (storage.foldername(name))[1]
  )
);

-- DELETE: Only event organizers can delete their event files
CREATE POLICY "Event organizers can delete their event files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'event-files' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM events 
    WHERE events.organizer_id = auth.uid() 
    AND events.id::text = (storage.foldername(name))[1]
  )
);