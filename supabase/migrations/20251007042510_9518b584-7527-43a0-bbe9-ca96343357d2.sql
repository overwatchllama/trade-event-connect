-- Fix security warnings by setting search_path on all trigger functions

-- Update notify_vendor_application function
CREATE OR REPLACE FUNCTION notify_vendor_application()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  event_organizer_id UUID;
  event_title TEXT;
BEGIN
  SELECT organizer_id, title INTO event_organizer_id, event_title
  FROM events
  WHERE id = NEW.event_id;

  INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
  VALUES (
    event_organizer_id,
    'New Vendor Application',
    'A vendor has applied to your event: ' || event_title,
    'vendor_application',
    NEW.id,
    'vendor_application'
  );

  RETURN NEW;
END;
$$;

-- Update notify_vendor_status_change function
CREATE OR REPLACE FUNCTION notify_vendor_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  event_title TEXT;
  status_message TEXT;
BEGIN
  IF OLD.application_status != NEW.application_status THEN
    SELECT title INTO event_title
    FROM events
    WHERE id = NEW.event_id;

    CASE NEW.application_status
      WHEN 'approved' THEN
        status_message := 'Your application has been approved for: ' || event_title;
      WHEN 'rejected' THEN
        status_message := 'Your application has been rejected for: ' || event_title;
      WHEN 'waitlist' THEN
        status_message := 'Your application has been added to the waitlist for: ' || event_title;
      ELSE
        status_message := 'Your application status has changed for: ' || event_title;
    END CASE;

    INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
    VALUES (
      NEW.user_id,
      'Application Status Update',
      status_message,
      'status_change',
      NEW.id,
      'vendor_application'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Update notify_payment_status_change function
CREATE OR REPLACE FUNCTION notify_payment_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  event_title TEXT;
  payment_message TEXT;
BEGIN
  IF OLD.payment_status != NEW.payment_status AND NEW.application_status = 'approved' THEN
    SELECT title INTO event_title
    FROM events
    WHERE id = NEW.event_id;

    CASE NEW.payment_status
      WHEN 'unpaid' THEN
        payment_message := 'You have an invoice pending for: ' || event_title;
      WHEN 'paid' THEN
        payment_message := 'Payment confirmed for: ' || event_title;
      WHEN 'refunded' THEN
        payment_message := 'Payment has been refunded for: ' || event_title;
      ELSE
        payment_message := 'Payment status updated for: ' || event_title;
    END CASE;

    INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
    VALUES (
      NEW.user_id,
      'Payment Update',
      payment_message,
      'invoice',
      NEW.id,
      'vendor_application'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Update notify_sponsor_application function
CREATE OR REPLACE FUNCTION notify_sponsor_application()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  event_organizer_id UUID;
  event_title TEXT;
BEGIN
  SELECT organizer_id, title INTO event_organizer_id, event_title
  FROM events
  WHERE id = NEW.event_id;

  INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
  VALUES (
    event_organizer_id,
    'New Sponsor Application',
    'A sponsor has applied to your event: ' || event_title,
    'sponsor_application',
    NEW.id,
    'sponsor_application'
  );

  RETURN NEW;
END;
$$;

-- Update notify_sponsor_status_change function
CREATE OR REPLACE FUNCTION notify_sponsor_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  event_title TEXT;
  status_message TEXT;
BEGIN
  IF OLD.application_status != NEW.application_status THEN
    SELECT title INTO event_title
    FROM events
    WHERE id = NEW.event_id;

    CASE NEW.application_status
      WHEN 'approved' THEN
        status_message := 'Your sponsorship has been approved for: ' || event_title;
      WHEN 'rejected' THEN
        status_message := 'Your sponsorship has been rejected for: ' || event_title;
      WHEN 'waitlist' THEN
        status_message := 'Your sponsorship has been added to the waitlist for: ' || event_title;
      ELSE
        status_message := 'Your sponsorship status has changed for: ' || event_title;
    END CASE;

    INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
    VALUES (
      NEW.user_id,
      'Sponsorship Status Update',
      status_message,
      'status_change',
      NEW.id,
      'sponsor_application'
    );
  END IF;

  RETURN NEW;
END;
$$;