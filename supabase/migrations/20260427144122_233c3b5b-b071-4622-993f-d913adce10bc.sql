
-- =========================================================
-- PHASE 1: SECURITY HARDENING
-- =========================================================

-- ---------- 1. SUBSCRIBERS: drop email-based access ----------
DROP POLICY IF EXISTS "Users can insert their own subscription" ON public.subscribers;
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.subscribers;
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscribers;
DROP POLICY IF EXISTS "select_own_subscription" ON public.subscribers;

CREATE POLICY "Owners can view their subscription"
  ON public.subscribers FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Owners can insert their subscription"
  ON public.subscribers FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owners can update their subscription"
  ON public.subscribers FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role manages subscriptions"
  ON public.subscribers FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ---------- 2. EVENT_STAFF_ASSIGNMENTS: scope to own row ----------
DROP POLICY IF EXISTS "Organizers and assigned staff can view assignments" ON public.event_staff_assignments;
DROP POLICY IF EXISTS "Organizers can manage their event staff assignments" ON public.event_staff_assignments;

CREATE POLICY "Organizers manage their event staff"
  ON public.event_staff_assignments FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_staff_assignments.event_id AND e.organizer_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_staff_assignments.event_id AND e.organizer_id = auth.uid()
  ));

CREATE POLICY "Staff view their own assignment"
  ON public.event_staff_assignments FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());


-- ---------- 3. VENDOR_APPLICATIONS: column-restricted public view ----------
DROP POLICY IF EXISTS "Authenticated users can view approved paid applications" ON public.vendor_applications;

CREATE OR REPLACE VIEW public.public_vendor_applications
WITH (security_invoker = true)
AS
SELECT
  id,
  event_id,
  vendor_id,
  application_status,
  payment_status,
  approved_tables,
  requested_tables,
  table_number,
  checked_in,
  checked_in_at,
  hide_from_calendar,
  application_date,
  approved_date,
  created_at,
  updated_at
FROM public.vendor_applications
WHERE application_status = 'approved'
  AND payment_status = 'paid';

GRANT SELECT ON public.public_vendor_applications TO anon, authenticated;

COMMENT ON VIEW public.public_vendor_applications IS
  'Public-safe projection of approved & paid vendor applications. Excludes stripe_payment_intent_id, notes, file_url, vendor_request*, and other sensitive columns. Use this view from client code instead of the underlying table for non-owner/non-organizer reads.';


-- ---------- 4. EVENT-FILES storage: scope vendors to own subfolder ----------
DROP POLICY IF EXISTS "Event organizers and sponsors can view event files" ON storage.objects;

CREATE POLICY "Organizers and sponsors view event files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'event-files'
    AND (
      EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.organizer_id = auth.uid()
          AND e.id::text = (storage.foldername(objects.name))[1]
      )
      OR EXISTS (
        SELECT 1
        FROM public.event_sponsors es
        JOIN public.sponsors s ON s.id = es.sponsor_id
        WHERE s.user_id = auth.uid()
          AND es.event_id::text = (storage.foldername(objects.name))[1]
      )
    )
  );

CREATE POLICY "Vendors view their own event files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'event-files'
    AND (storage.foldername(objects.name))[2] = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.vendor_applications va
      WHERE va.user_id = auth.uid()
        AND va.application_status = 'approved'
        AND va.event_id::text = (storage.foldername(objects.name))[1]
    )
  );
