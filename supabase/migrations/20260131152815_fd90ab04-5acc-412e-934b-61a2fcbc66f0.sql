-- Add branding customization fields to events table
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS brand_primary_color text DEFAULT '#667eea',
ADD COLUMN IF NOT EXISTS brand_secondary_color text DEFAULT '#764ba2',
ADD COLUMN IF NOT EXISTS brand_logo_url text;

-- Add comment for documentation
COMMENT ON COLUMN public.events.brand_primary_color IS 'Primary brand color for email templates (hex format)';
COMMENT ON COLUMN public.events.brand_secondary_color IS 'Secondary brand color for email templates (hex format)';
COMMENT ON COLUMN public.events.brand_logo_url IS 'Logo URL for email templates';