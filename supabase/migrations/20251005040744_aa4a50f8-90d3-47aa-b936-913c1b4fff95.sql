-- Add layout_json column to events table to store floor plan layouts
ALTER TABLE public.events 
ADD COLUMN layout_json jsonb DEFAULT NULL;

COMMENT ON COLUMN public.events.layout_json IS 'Stores the Fabric.js canvas JSON for the event floor plan layout';
