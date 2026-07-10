
-- 1. deal_list_items: remove overly permissive public policy (public_deal_list_items view already handles public reads)
DROP POLICY IF EXISTS "Anyone can view for sale items" ON public.deal_list_items;

-- 2. events: restrict base-table SELECT to authenticated users
DROP POLICY IF EXISTS "Public can view events" ON public.events;

CREATE POLICY "Authenticated can view events"
  ON public.events
  FOR SELECT
  TO authenticated
  USING (true);

-- 3. public_events view: safe subset for anonymous browsing (excludes contact_email, contact_phone, listing_stripe_session_id)
CREATE OR REPLACE VIEW public.public_events
WITH (security_invoker = off) AS
SELECT
  id, title, description, date, venue, address, city, state, zip_code,
  event_type, card_types, max_attendees, entry_fee, vendor_table_price,
  total_tables, tables_available, organizer_id, organizer_name, image_url,
  created_at, updated_at, flyer_url, is_multi_day, venue_id, layout_json,
  sponsor_tiers, preferred_contact_method, floor_plan_url,
  no_online_ticket_sales, age_pricing_info, vendor_notes, sponsor_tier_slots,
  no_sponsors, no_online_table_sales, vendor_start_time,
  brand_primary_color, brand_secondary_color, brand_logo_url, flyer_back_url,
  listing_payment_status, listing_tier, listing_fee_cents, listing_paid_at
FROM public.events;

GRANT SELECT ON public.public_events TO anon, authenticated;
