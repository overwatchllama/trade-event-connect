-- Add column to indicate if event has online ticket sales
ALTER TABLE events
ADD COLUMN no_online_ticket_sales boolean DEFAULT false;