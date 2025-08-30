-- Add new TCG types to the card_category enum
ALTER TYPE card_category ADD VALUE 'lorcana';
ALTER TYPE card_category ADD VALUE 'onepiece';

-- Update any existing collections that might be using 'other' to have proper categories
-- This is optional and won't affect new functionality