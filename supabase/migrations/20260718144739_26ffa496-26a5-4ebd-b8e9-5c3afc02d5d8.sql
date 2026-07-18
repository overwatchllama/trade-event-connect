
-- Fix SECURITY DEFINER view: public_events should use invoker
ALTER VIEW public.public_events SET (security_invoker = on);

-- Harden send_event_notifications to validate each target user_id is tied to the event
CREATE OR REPLACE FUNCTION public.send_event_notifications(p_event_id uuid, p_notifications jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  is_organizer boolean;
  is_approved_vendor boolean;
  notif jsonb;
  target_uid uuid;
  is_related boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM events WHERE id = p_event_id AND organizer_id = auth.uid()
  ) INTO is_organizer;

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

  FOR notif IN SELECT * FROM jsonb_array_elements(p_notifications)
  LOOP
    target_uid := (notif->>'user_id')::uuid;

    -- Validate the recipient is actually associated with this event
    SELECT
      EXISTS(SELECT 1 FROM events e WHERE e.id = p_event_id AND e.organizer_id = target_uid)
      OR EXISTS(
        SELECT 1 FROM vendor_applications va
        JOIN vendors v ON v.id = va.vendor_id
        WHERE va.event_id = p_event_id AND v.user_id = target_uid
      )
      OR EXISTS(
        SELECT 1 FROM orders o
        JOIN order_items oi ON oi.order_id = o.id
        WHERE oi.event_id = p_event_id AND o.user_id = target_uid
      )
      OR EXISTS(
        SELECT 1 FROM raffle_entries re
        JOIN raffle_items ri ON ri.id = re.raffle_item_id
        WHERE ri.event_id = p_event_id AND re.user_id = target_uid
      )
      OR EXISTS(
        SELECT 1 FROM sponsor_applications sa
        WHERE sa.event_id = p_event_id AND sa.user_id = target_uid
      )
      OR EXISTS(
        SELECT 1 FROM event_staff_assignments esa
        WHERE esa.event_id = p_event_id AND esa.user_id = target_uid
      )
    INTO is_related;

    IF NOT is_related THEN
      -- Silently skip unrelated recipients to prevent spoofed notifications
      CONTINUE;
    END IF;

    INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
    VALUES (
      target_uid,
      notif->>'title',
      notif->>'message',
      notif->>'type',
      notif->>'reference_id',
      notif->>'reference_type'
    );
  END LOOP;
END;
$function$;
