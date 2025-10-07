-- Add columns to track requested and approved table counts for vendor applications
ALTER TABLE vendor_applications
ADD COLUMN requested_tables integer DEFAULT 1 NOT NULL,
ADD COLUMN approved_tables integer;

-- Update existing records to have requested_tables = 1 if null
UPDATE vendor_applications
SET requested_tables = 1
WHERE requested_tables IS NULL;