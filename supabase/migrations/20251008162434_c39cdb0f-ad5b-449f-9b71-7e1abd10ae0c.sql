-- Add no_online_table_sales field to events table
ALTER TABLE events
ADD COLUMN no_online_table_sales boolean DEFAULT false;