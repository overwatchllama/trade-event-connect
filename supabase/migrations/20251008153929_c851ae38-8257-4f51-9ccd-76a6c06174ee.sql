-- Add sponsor tier slots to events table
ALTER TABLE events ADD COLUMN sponsor_tier_slots INTEGER;

-- NULL means unlimited, a number means that many slots available