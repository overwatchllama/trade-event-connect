-- Add a column to track vendor requests (withdraw, cancel, refund)
ALTER TABLE public.vendor_applications 
ADD COLUMN IF NOT EXISTS vendor_request text DEFAULT NULL;

-- Add a check constraint for valid values
ALTER TABLE public.vendor_applications 
ADD CONSTRAINT vendor_request_check 
CHECK (vendor_request IS NULL OR vendor_request IN ('withdrawn', 'cancellation_requested', 'refund_requested'));

-- Add timestamp for when request was made
ALTER TABLE public.vendor_applications 
ADD COLUMN IF NOT EXISTS vendor_request_at timestamp with time zone DEFAULT NULL;

-- Add a reason/notes field for the request
ALTER TABLE public.vendor_applications 
ADD COLUMN IF NOT EXISTS vendor_request_reason text DEFAULT NULL;