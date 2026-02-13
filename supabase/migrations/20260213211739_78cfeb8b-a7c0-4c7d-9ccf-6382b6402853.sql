-- Add check_in_token column for self-service staff check-in
ALTER TABLE public.event_staff_assignments 
ADD COLUMN check_in_token text UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex');

-- Backfill existing rows with tokens
UPDATE public.event_staff_assignments 
SET check_in_token = encode(gen_random_bytes(16), 'hex') 
WHERE check_in_token IS NULL;

-- Make it NOT NULL after backfill
ALTER TABLE public.event_staff_assignments 
ALTER COLUMN check_in_token SET NOT NULL;

-- Create index for fast token lookups
CREATE INDEX idx_staff_assignments_check_in_token ON public.event_staff_assignments(check_in_token);