
-- Add listing fields to inventory items for public storefront
ALTER TABLE public.deal_list_items
  ADD COLUMN IF NOT EXISTS listing_status text NOT NULL DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS list_price numeric,
  ADD COLUMN IF NOT EXISTS public_notes text,
  ADD COLUMN IF NOT EXISTS listed_at timestamptz;

-- Validate listing_status values
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'deal_list_items_listing_status_check'
  ) THEN
    ALTER TABLE public.deal_list_items
      ADD CONSTRAINT deal_list_items_listing_status_check
      CHECK (listing_status IN ('private','for_sale','sold','hold'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_deal_list_items_public_for_sale
  ON public.deal_list_items (user_id, listing_status)
  WHERE listing_status = 'for_sale';

-- Public can view items that vendors have marked for_sale (limited surface via app query)
DROP POLICY IF EXISTS "Anyone can view for sale items" ON public.deal_list_items;
CREATE POLICY "Anyone can view for sale items"
  ON public.deal_list_items
  FOR SELECT
  USING (listing_status = 'for_sale');

GRANT SELECT ON public.deal_list_items TO anon;

-- Per-event featured inventory picks
CREATE TABLE IF NOT EXISTS public.vendor_event_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL,
  event_id uuid NOT NULL,
  item_id uuid NOT NULL,
  user_id uuid NOT NULL,
  featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, item_id)
);

GRANT SELECT ON public.vendor_event_inventory TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_event_inventory TO authenticated;
GRANT ALL ON public.vendor_event_inventory TO service_role;

ALTER TABLE public.vendor_event_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view event inventory picks"
  ON public.vendor_event_inventory
  FOR SELECT
  USING (true);

CREATE POLICY "Vendors manage their own event inventory picks"
  ON public.vendor_event_inventory
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_vendor_event_inventory_event ON public.vendor_event_inventory (event_id);
CREATE INDEX IF NOT EXISTS idx_vendor_event_inventory_vendor ON public.vendor_event_inventory (vendor_id);
