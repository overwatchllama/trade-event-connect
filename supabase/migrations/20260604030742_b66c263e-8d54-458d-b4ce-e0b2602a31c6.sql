
-- 1. DEAL PROPOSALS
DROP POLICY IF EXISTS "Public can view shared proposals" ON public.deal_proposals;
DROP POLICY IF EXISTS "Public can view lines of shared proposals" ON public.deal_proposal_lines;

REVOKE SELECT ON public.deal_proposals FROM anon;
REVOKE SELECT ON public.deal_proposal_lines FROM anon;

CREATE OR REPLACE FUNCTION public.get_public_deal_proposal(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proposal jsonb;
  v_lines jsonb;
BEGIN
  IF p_token IS NULL OR length(p_token) < 8 THEN
    RETURN NULL;
  END IF;

  SELECT to_jsonb(p) - 'vendor_id'
    INTO v_proposal
  FROM public.deal_proposals p
  WHERE p.public_token = p_token
    AND p.status <> 'draft'
  LIMIT 1;

  IF v_proposal IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT coalesce(jsonb_agg(to_jsonb(l) ORDER BY l.sort_order), '[]'::jsonb)
    INTO v_lines
  FROM public.deal_proposal_lines l
  WHERE l.proposal_id = (v_proposal->>'id')::uuid;

  RETURN jsonb_build_object('proposal', v_proposal, 'lines', v_lines);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_deal_proposal(text) TO anon, authenticated;

-- 2. DEAL LIST ITEMS
DROP POLICY IF EXISTS "Public can view for-sale listings" ON public.deal_list_items;
DROP POLICY IF EXISTS "Public can view for_sale listings" ON public.deal_list_items;
DROP POLICY IF EXISTS "Anyone can view for_sale items" ON public.deal_list_items;
DROP POLICY IF EXISTS "Public can read for_sale deal items" ON public.deal_list_items;

REVOKE SELECT ON public.deal_list_items FROM anon;

CREATE OR REPLACE VIEW public.public_deal_list_items
WITH (security_invoker = on) AS
SELECT
  id, user_id, card_name, set_name, card_number, rarity, condition,
  quantity, list_price, public_notes, image_url, listing_status,
  game, external_id, tcgplayer_url, listed_at
FROM public.deal_list_items
WHERE listing_status = 'for_sale';

GRANT SELECT ON public.public_deal_list_items TO anon, authenticated;

-- 3. EVENT FILES
ALTER TABLE public.event_files
  ADD COLUMN IF NOT EXISTS vendor_accessible boolean NOT NULL DEFAULT true;

DROP POLICY IF EXISTS "Approved vendors can view event files" ON public.event_files;
DROP POLICY IF EXISTS "Vendors can view event files" ON public.event_files;
DROP POLICY IF EXISTS "Approved paid vendors can view event files" ON public.event_files;

CREATE POLICY "Approved vendors can view vendor-accessible event files"
  ON public.event_files FOR SELECT
  TO authenticated
  USING (
    vendor_accessible = true
    AND EXISTS (
      SELECT 1 FROM public.vendor_applications va
      JOIN public.vendors v ON v.id = va.vendor_id
      WHERE va.event_id = event_files.event_id
        AND v.user_id = auth.uid()
        AND va.application_status = 'approved'
        AND va.payment_status = 'paid'
    )
  );

-- 4. EVENT STAFF ROLES
DROP POLICY IF EXISTS "Anyone can view event staff roles" ON public.event_staff_roles;
DROP POLICY IF EXISTS "Public can view event staff roles" ON public.event_staff_roles;
DROP POLICY IF EXISTS "Event staff roles are publicly viewable" ON public.event_staff_roles;

CREATE POLICY "Authenticated users can view event staff roles"
  ON public.event_staff_roles FOR SELECT
  TO authenticated
  USING (true);

REVOKE SELECT ON public.event_staff_roles FROM anon;

-- 5. VENUES
DROP POLICY IF EXISTS "Anyone can view venues" ON public.venues;
DROP POLICY IF EXISTS "Venues are publicly viewable" ON public.venues;
DROP POLICY IF EXISTS "Public can view venues" ON public.venues;

CREATE POLICY "Authenticated users can view venues"
  ON public.venues FOR SELECT
  TO authenticated
  USING (true);

REVOKE SELECT ON public.venues FROM anon;

CREATE OR REPLACE VIEW public.public_venues
WITH (security_invoker = on) AS
SELECT
  id, name, description, address, city, state, zip_code,
  website_url, capacity, amenities, image_url, verified, created_at
FROM public.venues;

GRANT SELECT ON public.public_venues TO anon, authenticated;
