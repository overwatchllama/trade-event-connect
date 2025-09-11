-- Add vendor types column to vendors table
ALTER TABLE vendors 
ADD COLUMN vendor_types text[] DEFAULT '{}';

-- Update existing vendors with example vendor types
UPDATE vendors 
SET vendor_types = ARRAY['brick_and_mortar', 'online']
WHERE business_name = 'Test Trading Cards';

UPDATE vendors 
SET vendor_types = ARRAY['brick_and_mortar', 'online', 'tournament']
WHERE business_name = 'Elite Pokemon Cards';

UPDATE vendors 
SET vendor_types = ARRAY['brick_and_mortar', 'show_vendor']
WHERE business_name = 'Magic Kingdom Cards';

UPDATE vendors 
SET vendor_types = ARRAY['brick_and_mortar', 'tournament', 'event_runner']
WHERE business_name = 'Sports Card Central';

UPDATE vendors 
SET vendor_types = ARRAY['online', 'show_vendor']
WHERE business_name = 'Anime Card Paradise';

UPDATE vendors 
SET vendor_types = ARRAY['brick_and_mortar', 'online', 'event_runner', 'show_vendor']
WHERE business_name = 'Retro Gaming Cards';