-- Fix sponsor_applications SELECT policy
DROP POLICY IF EXISTS "Sponsors can view their own applications" ON sponsor_applications;

CREATE POLICY "Sponsors can view their own applications" 
ON sponsor_applications 
FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Event organizers can view sponsor applications for their events" ON sponsor_applications;

CREATE POLICY "Event organizers can view sponsor applications for their events" 
ON sponsor_applications 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM events 
    WHERE events.id = sponsor_applications.event_id 
    AND events.organizer_id = auth.uid()
  )
);

-- Fix subscribers policies
DROP POLICY IF EXISTS "Users can insert their own subscription" ON subscribers;

CREATE POLICY "Users can insert their own subscription" 
ON subscribers 
FOR INSERT 
WITH CHECK (
  (user_id = auth.uid()) OR 
  (email = auth.email())
);

DROP POLICY IF EXISTS "Users can update their own subscription" ON subscribers;

CREATE POLICY "Users can update their own subscription" 
ON subscribers 
FOR UPDATE 
USING (
  (user_id = auth.uid()) OR 
  (email = auth.email())
);

-- Fix notifications INSERT policy
DROP POLICY IF EXISTS "Service role can insert notifications" ON notifications;

CREATE POLICY "Service role can insert notifications" 
ON notifications 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Fix venue_claims SELECT policies
DROP POLICY IF EXISTS "Claimers can view their own claims" ON venue_claims;

CREATE POLICY "Claimers can view their own claims" 
ON venue_claims 
FOR SELECT 
USING (auth.uid() = claimer_id);

DROP POLICY IF EXISTS "Venue owners can view claims on their venues" ON venue_claims;

CREATE POLICY "Venue owners can view claims on their venues" 
ON venue_claims 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM venues 
    WHERE venues.id = venue_claims.venue_id 
    AND venues.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins can view all venue claims" ON venue_claims;

CREATE POLICY "Admins can view all venue claims" 
ON venue_claims 
FOR SELECT 
USING (is_admin());