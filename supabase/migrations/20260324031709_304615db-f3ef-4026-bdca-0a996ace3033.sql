
-- Drop the overly permissive INSERT policy on notifications
DROP POLICY IF EXISTS "Service role can insert notifications" ON notifications;

-- Create a SECURITY DEFINER function for authorized notification sending
CREATE OR REPLACE FUNCTION public.send_event_notifications(
  p_event_id uuid,
  p_notifications jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_organizer boolean;
  is_approved_vendor boolean;
  notif jsonb;
BEGIN
  -- Check if caller is event organizer
  SELECT EXISTS(
    SELECT 1 FROM events WHERE id = p_event_id AND organizer_id = auth.uid()
  ) INTO is_organizer;
  
  -- Check if caller is an approved paid vendor at this event
  SELECT EXISTS(
    SELECT 1 FROM vendor_applications va
    JOIN vendors v ON v.id = va.vendor_id
    WHERE va.event_id = p_event_id
      AND v.user_id = auth.uid()
      AND va.application_status = 'approved'
      AND va.payment_status = 'paid'
  ) INTO is_approved_vendor;
  
  IF NOT is_organizer AND NOT is_approved_vendor THEN
    RAISE EXCEPTION 'Unauthorized: Must be event organizer or approved vendor';
  END IF;
  
  -- Insert each notification
  FOR notif IN SELECT * FROM jsonb_array_elements(p_notifications)
  LOOP
    INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
    VALUES (
      (notif->>'user_id')::uuid,
      notif->>'title',
      notif->>'message',
      notif->>'type',
      notif->>'reference_id',
      notif->>'reference_type'
    );
  END LOOP;
END;
$$;
