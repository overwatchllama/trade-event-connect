-- Add new subscription tier roles to the user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'event_pro';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'vendor_pro';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'collector_pro';