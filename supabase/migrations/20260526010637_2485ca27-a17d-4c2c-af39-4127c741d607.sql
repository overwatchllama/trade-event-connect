
-- 1) Storage policy for event-files: require approved AND paid
DROP POLICY IF EXISTS "Vendors view their own event files" ON storage.objects;
CREATE POLICY "Vendors view their own event files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'event-files'
  AND (storage.foldername(name))[2] = (auth.uid())::text
  AND EXISTS (
    SELECT 1 FROM public.vendor_applications va
    WHERE va.user_id = auth.uid()
      AND va.application_status = 'approved'
      AND va.payment_status = 'paid'
      AND (va.event_id)::text = (storage.foldername(objects.name))[1]
  )
);

-- 2) user_roles: restrict self-assignment to non-privileged roles
DROP POLICY IF EXISTS "Users can add free roles to themselves" ON public.user_roles;
DROP POLICY IF EXISTS "Users can remove free roles from themselves" ON public.user_roles;

CREATE POLICY "Users can add basic roles to themselves"
ON public.user_roles FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND role = ANY (ARRAY['user'::user_role, 'vendor'::user_role])
);

CREATE POLICY "Users can remove basic roles from themselves"
ON public.user_roles FOR DELETE
USING (
  auth.uid() = user_id
  AND role = ANY (ARRAY['user'::user_role, 'vendor'::user_role])
);

-- 3) vendor_table_listings: restrict buyer-claim UPDATE to safe columns via WITH CHECK
DROP POLICY IF EXISTS "Buyers can claim listings" ON public.vendor_table_listings;
CREATE POLICY "Buyers can claim listings"
ON public.vendor_table_listings FOR UPDATE
USING (
  status = 'available'
  AND (
    listing_type = 'public'
    OR target_vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
  )
)
WITH CHECK (
  -- Buyer becomes the claimant; immutable fields must remain unchanged
  buyer_user_id = auth.uid()
  AND status IN ('claimed', 'pending_payment', 'paid', 'sold')
  AND seller_vendor_id = (SELECT seller_vendor_id FROM public.vendor_table_listings vtl WHERE vtl.id = vendor_table_listings.id)
  AND price_per_table IS NOT DISTINCT FROM (SELECT price_per_table FROM public.vendor_table_listings vtl WHERE vtl.id = vendor_table_listings.id)
  AND tables_offered = (SELECT tables_offered FROM public.vendor_table_listings vtl WHERE vtl.id = vendor_table_listings.id)
  AND event_id = (SELECT event_id FROM public.vendor_table_listings vtl WHERE vtl.id = vendor_table_listings.id)
  AND listing_type = (SELECT listing_type FROM public.vendor_table_listings vtl WHERE vtl.id = vendor_table_listings.id)
);
