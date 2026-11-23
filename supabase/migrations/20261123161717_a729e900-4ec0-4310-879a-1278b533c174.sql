-- 1) Venues: creators must be the owner of the venue they add
DROP POLICY IF EXISTS "Users can create venues" ON public.venues;
CREATE POLICY "Users can create their own venues"
ON public.venues FOR INSERT TO authenticated
WITH CHECK (auth.uid() = owner_id);

-- 2) Event staff roles: only the organizer, admins, and staff assigned to that event
DROP POLICY IF EXISTS "Authenticated users can view event staff roles" ON public.event_staff_roles;
CREATE POLICY "Organizers, admins and assigned staff can view event staff roles"
ON public.event_staff_roles FOR SELECT TO authenticated
USING (
  public.is_admin(auth.uid())
  OR EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_staff_roles.event_id AND e.organizer_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.event_staff_assignments a WHERE a.event_id = event_staff_roles.event_id AND a.user_id = auth.uid())
);

-- 3) Sponsors: full rows (incl. contact details) only for the owner, admins,
--    and organizers of events the sponsor applied to or sponsors
DROP POLICY IF EXISTS "Authenticated users can view sponsors" ON public.sponsors;
CREATE POLICY "Owners, admins and related organizers can view sponsors"
ON public.sponsors FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.sponsor_applications sa
    JOIN public.events e ON e.id = sa.event_id
    WHERE sa.sponsor_id = sponsors.id AND e.organizer_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.event_sponsors es
    JOIN public.events e ON e.id = es.event_id
    WHERE es.sponsor_id = sponsors.id AND e.organizer_id = auth.uid()
  )
);

-- Public, contact-free sponsor directory
CREATE OR REPLACE FUNCTION public.get_public_sponsors(p_ids uuid[] DEFAULT NULL)
RETURNS TABLE (
  id uuid, user_id uuid, company_name text, company_description text,
  logo_url text, banner_url text, website_url text, verified boolean,
  rating numeric, total_reviews integer, social_instagram text, social_twitter text,
  social_facebook text, social_linkedin text, company_address text, specialties text[],
  created_at timestamptz, updated_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.id, s.user_id, s.company_name, s.company_description, s.logo_url, s.banner_url,
         s.website_url, s.verified, s.rating, s.total_reviews, s.social_instagram, s.social_twitter,
         s.social_facebook, s.social_linkedin, s.company_address, s.specialties, s.created_at, s.updated_at
  FROM public.sponsors s
  WHERE p_ids IS NULL OR s.id = ANY(p_ids)
  ORDER BY s.company_name;
$$;
REVOKE ALL ON FUNCTION public.get_public_sponsors(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_sponsors(uuid[]) TO anon, authenticated;