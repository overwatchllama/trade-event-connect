DROP POLICY IF EXISTS "Vendors can view all vendor profiles" ON public.vendors;
CREATE POLICY "Authenticated users can view vendor profiles"
ON public.vendors FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can view sponsors" ON public.sponsors;
CREATE POLICY "Authenticated users can view sponsors"
ON public.sponsors FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can view raffle draws" ON public.raffle_draws;
CREATE POLICY "Authorized users can view raffle draws"
ON public.raffle_draws FOR SELECT TO authenticated
USING (
  winner_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.raffle_items ri
    JOIN public.events e ON e.id = ri.event_id
    WHERE ri.id = raffle_draws.raffle_item_id AND e.organizer_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.raffle_items ri
    JOIN public.vendors v ON v.id = ri.vendor_id
    WHERE ri.id = raffle_draws.raffle_item_id AND v.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Anyone can view event staff assignments" ON public.event_staff_assignments;
CREATE POLICY "Organizers and assigned staff can view assignments"
ON public.event_staff_assignments FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_staff_assignments.event_id AND e.organizer_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Anyone can view approved paid vendor applications" ON public.vendor_applications;
CREATE POLICY "Authenticated users can view approved paid applications"
ON public.vendor_applications FOR SELECT TO authenticated
USING (
  application_status = 'approved'::vendor_application_status
  AND payment_status = 'paid'::payment_status
);