-- Add no sponsors toggle to events table
ALTER TABLE events ADD COLUMN no_sponsors BOOLEAN DEFAULT false;