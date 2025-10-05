-- Change sponsor_tiers to JSONB for structured data
ALTER TABLE public.events ALTER COLUMN sponsor_tiers TYPE JSONB USING sponsor_tiers::jsonb;