
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS listing_payment_status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS listing_tier text,
  ADD COLUMN IF NOT EXISTS listing_fee_cents integer,
  ADD COLUMN IF NOT EXISTS listing_paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS listing_stripe_session_id text;
