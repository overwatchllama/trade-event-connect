-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL, -- 'vendor_application', 'sponsor_application', 'status_change', 'invoice'
  reference_id UUID, -- ID of the related application/event
  reference_type TEXT, -- 'vendor_application', 'sponsor_application', 'event'
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Policy: System can insert notifications (for triggers)
CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- Function to create notification for new vendor application
CREATE OR REPLACE FUNCTION notify_vendor_application()
RETURNS TRIGGER AS $$
DECLARE
  event_organizer_id UUID;
  event_title TEXT;
BEGIN
  -- Get event organizer and title
  SELECT organizer_id, title INTO event_organizer_id, event_title
  FROM events
  WHERE id = NEW.event_id;

  -- Create notification for organizer
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to notify vendor of application status change
CREATE OR REPLACE FUNCTION notify_vendor_status_change()
RETURNS TRIGGER AS $$
DECLARE
  event_title TEXT;
  status_message TEXT;
BEGIN
  -- Only notify if status changed
  IF OLD.application_status != NEW.application_status THEN
    -- Get event title
    SELECT title INTO event_title
    FROM events
    WHERE id = NEW.event_id;

    -- Create appropriate message based on status
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

    -- Create notification for vendor
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to notify vendor of payment status change
CREATE OR REPLACE FUNCTION notify_payment_status_change()
RETURNS TRIGGER AS $$
DECLARE
  event_title TEXT;
  payment_message TEXT;
BEGIN
  -- Only notify if payment status changed and it's an invoice (unpaid)
  IF OLD.payment_status != NEW.payment_status AND NEW.application_status = 'approved' THEN
    -- Get event title
    SELECT title INTO event_title
    FROM events
    WHERE id = NEW.event_id;

    -- Create appropriate message based on payment status
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

    -- Create notification for vendor
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification for new sponsor application
CREATE OR REPLACE FUNCTION notify_sponsor_application()
RETURNS TRIGGER AS $$
DECLARE
  event_organizer_id UUID;
  event_title TEXT;
BEGIN
  -- Get event organizer and title
  SELECT organizer_id, title INTO event_organizer_id, event_title
  FROM events
  WHERE id = NEW.event_id;

  -- Create notification for organizer
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to notify sponsor of application status change
CREATE OR REPLACE FUNCTION notify_sponsor_status_change()
RETURNS TRIGGER AS $$
DECLARE
  event_title TEXT;
  status_message TEXT;
BEGIN
  -- Only notify if status changed
  IF OLD.application_status != NEW.application_status THEN
    -- Get event title
    SELECT title INTO event_title
    FROM events
    WHERE id = NEW.event_id;

    -- Create appropriate message based on status
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

    -- Create notification for sponsor
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for vendor applications
CREATE TRIGGER trigger_notify_vendor_application
  AFTER INSERT ON vendor_applications
  FOR EACH ROW
  EXECUTE FUNCTION notify_vendor_application();

CREATE TRIGGER trigger_notify_vendor_status
  AFTER UPDATE ON vendor_applications
  FOR EACH ROW
  EXECUTE FUNCTION notify_vendor_status_change();

CREATE TRIGGER trigger_notify_payment_status
  AFTER UPDATE ON vendor_applications
  FOR EACH ROW
  EXECUTE FUNCTION notify_payment_status_change();

-- Triggers for sponsor applications
CREATE TRIGGER trigger_notify_sponsor_application
  AFTER INSERT ON sponsor_applications
  FOR EACH ROW
  EXECUTE FUNCTION notify_sponsor_application();

CREATE TRIGGER trigger_notify_sponsor_status
  AFTER UPDATE ON sponsor_applications
  FOR EACH ROW
  EXECUTE FUNCTION notify_sponsor_status_change();