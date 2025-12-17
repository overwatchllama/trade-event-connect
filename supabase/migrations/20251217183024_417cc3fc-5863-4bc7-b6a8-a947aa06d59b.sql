-- Allow anyone to view approved and paid vendor applications (public info - vendor is attending event)
CREATE POLICY "Anyone can view approved paid vendor applications" 
ON public.vendor_applications 
FOR SELECT 
USING (application_status = 'approved' AND payment_status = 'paid');