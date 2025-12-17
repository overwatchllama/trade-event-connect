-- Create function to notify favorite vendor followers when vendor is approved+paid for an event
CREATE OR REPLACE FUNCTION public.notify_favorite_vendor_followers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  vendor_name TEXT;
  event_title TEXT;
  event_date TEXT;
  follower RECORD;
BEGIN
  -- Only trigger when status becomes approved AND payment becomes paid
  -- Check if this is the transition to both approved and paid
  IF NEW.application_status = 'approved' AND NEW.payment_status = 'paid' THEN
    -- Check if either field just changed to this state
    IF (OLD.application_status != 'approved' OR OLD.payment_status != 'paid') THEN
      -- Get vendor name
      SELECT business_name INTO vendor_name
      FROM vendors
      WHERE id = NEW.vendor_id;

      -- Get event details
      SELECT title, date INTO event_title, event_date
      FROM events
      WHERE id = NEW.event_id;

      -- Find all users who have favorited this vendor
      FOR follower IN
        SELECT user_id
        FROM user_subscriptions
        WHERE subscription_type = 'favorite_vendor'
          AND target_id = NEW.vendor_id
          AND user_id != NEW.user_id  -- Don't notify the vendor themselves
      LOOP
        INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
        VALUES (
          follower.user_id,
          'Favorite Vendor Alert',
          vendor_name || ' will be at ' || event_title || ' on ' || event_date,
          'favorite_vendor_event',
          NEW.event_id,
          'event'
        );
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on vendor_applications
DROP TRIGGER IF EXISTS notify_favorite_vendor_followers_trigger ON vendor_applications;
CREATE TRIGGER notify_favorite_vendor_followers_trigger
AFTER UPDATE ON vendor_applications
FOR EACH ROW
EXECUTE FUNCTION public.notify_favorite_vendor_followers();