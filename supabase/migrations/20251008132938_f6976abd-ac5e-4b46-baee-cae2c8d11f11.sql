-- Add floor plan URL column to events table
ALTER TABLE events
ADD COLUMN floor_plan_url text;