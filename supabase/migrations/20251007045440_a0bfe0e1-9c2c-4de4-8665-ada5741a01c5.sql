-- Add check-in tracking for vendors on event day
ALTER TABLE vendor_applications
ADD COLUMN checked_in boolean DEFAULT false,
ADD COLUMN checked_in_at timestamp with time zone;