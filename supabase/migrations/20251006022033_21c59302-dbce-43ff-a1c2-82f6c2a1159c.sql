-- Add 'waitlist' value to vendor_application_status enum
ALTER TYPE vendor_application_status ADD VALUE IF NOT EXISTS 'waitlist';