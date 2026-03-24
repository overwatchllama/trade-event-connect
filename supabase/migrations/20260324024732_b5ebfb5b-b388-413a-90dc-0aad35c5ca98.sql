
-- Add vendor_id to raffle_items for vendor-created raffles
ALTER TABLE public.raffle_items 
  ADD COLUMN vendor_id uuid REFERENCES public.vendors(id) ON DELETE CASCADE;

-- Allow vendors with approved+paid applications to manage their own raffle items
CREATE POLICY "Vendors can manage their own raffle items"
ON public.raffle_items
FOR ALL
TO authenticated
USING (
  vendor_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.vendors v 
    WHERE v.id = raffle_items.vendor_id 
    AND v.user_id = auth.uid()
  )
)
WITH CHECK (
  vendor_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.vendors v 
    WHERE v.id = raffle_items.vendor_id 
    AND v.user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM public.vendor_applications va
    WHERE va.vendor_id = raffle_items.vendor_id
    AND va.event_id = raffle_items.event_id
    AND va.application_status = 'approved'
    AND va.payment_status = 'paid'
  )
);

-- Allow vendors to manage draws for their own raffle items
CREATE POLICY "Vendors can manage draws for their raffle items"
ON public.raffle_draws
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.raffle_items ri
    JOIN public.vendors v ON v.id = ri.vendor_id
    WHERE ri.id = raffle_draws.raffle_item_id
    AND v.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.raffle_items ri
    JOIN public.vendors v ON v.id = ri.vendor_id
    WHERE ri.id = raffle_draws.raffle_item_id
    AND v.user_id = auth.uid()
  )
);
