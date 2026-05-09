
-- Replace insecure invite-claim policy with a SECURITY DEFINER RPC
DROP POLICY IF EXISTS "Users can claim invite codes" ON public.vendor_employees;

CREATE OR REPLACE FUNCTION public.claim_vendor_invite(_invite_code text)
RETURNS public.vendor_employees
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.vendor_employees;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _invite_code IS NULL OR length(trim(_invite_code)) = 0 THEN
    RAISE EXCEPTION 'Invite code required';
  END IF;

  UPDATE public.vendor_employees
  SET user_id = auth.uid(),
      status = 'active',
      hired_at = COALESCE(hired_at, now()),
      invite_code = NULL,
      invite_expires_at = NULL,
      updated_at = now()
  WHERE invite_code = upper(trim(_invite_code))
    AND user_id IS NULL
    AND (invite_expires_at IS NULL OR invite_expires_at > now())
  RETURNING * INTO _row;

  IF _row.id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invite code';
  END IF;

  RETURN _row;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_vendor_invite(text) FROM public;
GRANT EXECUTE ON FUNCTION public.claim_vendor_invite(text) TO authenticated;

-- Allow approved+paid vendors to read event_files metadata (storage already grants object access)
CREATE POLICY "Approved vendors can view event files"
ON public.event_files
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.vendor_applications va
    JOIN public.vendors v ON v.id = va.vendor_id
    WHERE va.event_id = event_files.event_id
      AND v.user_id = auth.uid()
      AND va.application_status = 'approved'
      AND va.payment_status = 'paid'
  )
);
