-- Add per-day cost for multi-day events
ALTER TABLE event_days
ADD COLUMN ticket_cost numeric;