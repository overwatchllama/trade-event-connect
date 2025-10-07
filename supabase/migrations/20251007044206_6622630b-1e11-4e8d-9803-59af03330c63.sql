-- Fix event_id type mismatch in vendor_applications table
-- This will allow proper joins and status updates

-- First, ensure all existing event_id values are valid UUIDs
-- If there are any invalid values, this will fail and need manual cleanup

ALTER TABLE vendor_applications 
ALTER COLUMN event_id TYPE uuid USING event_id::uuid;

-- Add foreign key constraint for data integrity
ALTER TABLE vendor_applications
ADD CONSTRAINT vendor_applications_event_id_fkey 
FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;