-- 1) Trusted vendor groups owned by a vendor
CREATE TABLE public.vendor_trusted_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_trusted_groups TO authenticated;
GRANT ALL ON public.vendor_trusted_groups TO service_role;

ALTER TABLE public.vendor_trusted_groups ENABLE ROW LEVEL SECURITY;

-- 2) Members of a trusted group
CREATE TABLE public.vendor_trusted_group_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid NOT NULL REFERENCES public.vendor_trusted_groups(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  added_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(group_id, vendor_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_trusted_group_members TO authenticated;
GRANT ALL ON public.vendor_trusted_group_members TO service_role;

ALTER TABLE public.vendor_trusted_group_members ENABLE ROW LEVEL SECURITY;

-- 3) Policies (after both tables exist)
CREATE POLICY "Owners manage their trusted groups"
  ON public.vendor_trusted_groups
  FOR ALL
  USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Members can view their groups"
  ON public.vendor_trusted_groups
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.vendor_trusted_group_members m
    JOIN public.vendors v ON v.id = m.vendor_id
    WHERE m.group_id = vendor_trusted_groups.id
      AND v.user_id = auth.uid()
  ));

CREATE POLICY "Group owners manage members"
  ON public.vendor_trusted_group_members
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.vendor_trusted_groups g
    WHERE g.id = vendor_trusted_group_members.group_id
      AND g.owner_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.vendor_trusted_groups g
    WHERE g.id = vendor_trusted_group_members.group_id
      AND g.owner_user_id = auth.uid()
  ));

CREATE POLICY "Members see their own membership"
  ON public.vendor_trusted_group_members
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.vendors v
    WHERE v.id = vendor_trusted_group_members.vendor_id
      AND v.user_id = auth.uid()
  ));

CREATE TRIGGER update_vendor_trusted_groups_updated_at
  BEFORE UPDATE ON public.vendor_trusted_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Extend vendor_table_listings to support 'group' visibility
ALTER TABLE public.vendor_table_listings
  DROP CONSTRAINT IF EXISTS vendor_table_listings_listing_type_check;

ALTER TABLE public.vendor_table_listings
  ADD CONSTRAINT vendor_table_listings_listing_type_check
  CHECK (listing_type IN ('public', 'direct', 'group'));

ALTER TABLE public.vendor_table_listings
  ADD COLUMN IF NOT EXISTS target_group_id uuid REFERENCES public.vendor_trusted_groups(id) ON DELETE SET NULL;

CREATE POLICY "Group members can view group listings"
  ON public.vendor_table_listings
  FOR SELECT
  USING (
    listing_type = 'group'
    AND target_group_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.vendor_trusted_group_members m
      JOIN public.vendors v ON v.id = m.vendor_id
      WHERE m.group_id = vendor_table_listings.target_group_id
        AND v.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Buyers can claim listings" ON public.vendor_table_listings;
CREATE POLICY "Buyers can claim listings"
ON public.vendor_table_listings FOR UPDATE
USING (
  status = 'available'
  AND (
    listing_type = 'public'
    OR (
      listing_type = 'direct'
      AND target_vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
    )
    OR (
      listing_type = 'group'
      AND target_group_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.vendor_trusted_group_members m
        JOIN public.vendors v ON v.id = m.vendor_id
        WHERE m.group_id = vendor_table_listings.target_group_id
          AND v.user_id = auth.uid()
      )
    )
  )
)
WITH CHECK (
  buyer_user_id = auth.uid()
  AND status IN ('claimed', 'pending_payment', 'paid', 'sold')
  AND seller_vendor_id = (SELECT seller_vendor_id FROM public.vendor_table_listings vtl WHERE vtl.id = vendor_table_listings.id)
  AND price_per_table IS NOT DISTINCT FROM (SELECT price_per_table FROM public.vendor_table_listings vtl WHERE vtl.id = vendor_table_listings.id)
  AND tables_offered = (SELECT tables_offered FROM public.vendor_table_listings vtl WHERE vtl.id = vendor_table_listings.id)
  AND event_id = (SELECT event_id FROM public.vendor_table_listings vtl WHERE vtl.id = vendor_table_listings.id)
  AND listing_type = (SELECT listing_type FROM public.vendor_table_listings vtl WHERE vtl.id = vendor_table_listings.id)
);

CREATE INDEX IF NOT EXISTS idx_vtl_target_group ON public.vendor_table_listings(target_group_id);
CREATE INDEX IF NOT EXISTS idx_vtgm_group ON public.vendor_trusted_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_vtgm_vendor ON public.vendor_trusted_group_members(vendor_id);