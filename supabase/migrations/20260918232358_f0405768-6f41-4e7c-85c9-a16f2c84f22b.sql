
-- Helper: detect trusted server-side (service role) context
CREATE OR REPLACE FUNCTION public.is_service_context()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT auth.uid() IS NULL
      OR coalesce(auth.jwt() ->> 'role', '') = 'service_role';
$$;

-- ============================================================
-- 1. Ticket price / payment status tampering
-- ============================================================
CREATE OR REPLACE FUNCTION public.enforce_order_payment_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF public.is_service_context() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.payment_status IS DISTINCT FROM 'pending'
       AND coalesce(NEW.total_amount, 0) <> 0 THEN
      RAISE EXCEPTION 'Orders with a balance must be created as pending';
    END IF;
    IF NEW.payment_status NOT IN ('pending', 'unpaid', 'completed') THEN
      RAISE EXCEPTION 'Invalid payment status';
    END IF;
    IF NEW.payment_status = 'completed' AND coalesce(NEW.total_amount, 0) <> 0 THEN
      RAISE EXCEPTION 'Paid orders can only be completed by payment verification';
    END IF;
    NEW.stripe_payment_intent_id := NULL;
    RETURN NEW;
  END IF;

  -- UPDATE by a regular user: payment/stripe fields are immutable
  NEW.payment_status := OLD.payment_status;
  NEW.stripe_payment_intent_id := OLD.stripe_payment_intent_id;
  NEW.stripe_session_id := OLD.stripe_session_id;
  NEW.total_amount := OLD.total_amount;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_payment_integrity ON public.orders;
CREATE TRIGGER trg_orders_payment_integrity
BEFORE INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.enforce_order_payment_integrity();

CREATE OR REPLACE FUNCTION public.enforce_ticket_price_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_expected numeric;
BEGIN
  IF public.is_service_context() THEN
    RETURN NEW;
  END IF;

  SELECT coalesce(ed.ticket_cost, e.entry_fee, 0)
    INTO v_expected
  FROM public.events e
  LEFT JOIN public.event_days ed
    ON ed.id = NEW.event_day_id AND ed.event_id = e.id
  WHERE e.id = NEW.event_id;

  IF v_expected IS NULL THEN
    RAISE EXCEPTION 'Unknown event for ticket';
  END IF;

  IF coalesce(NEW.unit_price, 0) <> v_expected THEN
    RAISE EXCEPTION 'Ticket price does not match the event price';
  END IF;

  IF coalesce(NEW.quantity, 1) < 1 THEN
    RAISE EXCEPTION 'Invalid ticket quantity';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    NEW.unit_price := OLD.unit_price;
    NEW.event_id := OLD.event_id;
    NEW.event_day_id := OLD.event_day_id;
    NEW.ticket_code := OLD.ticket_code;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_items_price_integrity ON public.order_items;
CREATE TRIGGER trg_order_items_price_integrity
BEFORE INSERT OR UPDATE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.enforce_ticket_price_integrity();

-- ============================================================
-- 2. Vendors self-approving their applications
-- ============================================================
CREATE OR REPLACE FUNCTION public.enforce_vendor_application_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_is_organizer boolean;
BEGIN
  IF public.is_service_context() OR public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = NEW.event_id AND e.organizer_id = auth.uid()
  ) INTO v_is_organizer;

  IF v_is_organizer THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.application_status := 'pending';
    NEW.payment_status := 'unpaid';
    NEW.approved_date := NULL;
    NEW.approved_tables := NULL;
    NEW.stripe_payment_intent_id := NULL;
    NEW.payment_date := NULL;
    NEW.checked_in := false;
    NEW.checked_in_at := NULL;
    NEW.table_number := NULL;
    RETURN NEW;
  END IF;

  -- Vendor updating their own row: approval/payment fields are immutable
  NEW.application_status := OLD.application_status;
  NEW.payment_status := OLD.payment_status;
  NEW.approved_date := OLD.approved_date;
  NEW.approved_tables := OLD.approved_tables;
  NEW.stripe_payment_intent_id := OLD.stripe_payment_intent_id;
  NEW.payment_date := OLD.payment_date;
  NEW.checked_in := OLD.checked_in;
  NEW.checked_in_at := OLD.checked_in_at;
  NEW.table_number := OLD.table_number;
  NEW.file_url := OLD.file_url;
  NEW.event_id := OLD.event_id;
  NEW.user_id := OLD.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vendor_applications_field_guard ON public.vendor_applications;
CREATE TRIGGER trg_vendor_applications_field_guard
BEFORE INSERT OR UPDATE ON public.vendor_applications
FOR EACH ROW EXECUTE FUNCTION public.enforce_vendor_application_fields();

-- ============================================================
-- 3. Events: hide contact / notes / stripe session from general reads
-- ============================================================
DROP VIEW IF EXISTS public.public_events;

DO $$
DECLARE
  cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position)
    INTO cols
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'events'
    AND column_name NOT IN ('contact_email', 'contact_phone', 'vendor_notes', 'listing_stripe_session_id');

  EXECUTE 'REVOKE SELECT ON public.events FROM anon, authenticated';
  EXECUTE format('GRANT SELECT (%s) ON public.events TO anon, authenticated', cols);
  EXECUTE format('CREATE VIEW public.public_events WITH (security_invoker = on) AS SELECT %s FROM public.events', cols);
END $$;

GRANT SELECT ON public.public_events TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;

CREATE OR REPLACE FUNCTION public.get_event_private_details(p_event_id uuid)
RETURNS TABLE(contact_email text, contact_phone text, preferred_contact_method text, vendor_notes text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT e.contact_email, e.contact_phone, e.preferred_contact_method, e.vendor_notes
  FROM public.events e
  WHERE e.id = p_event_id
    AND (
      e.organizer_id = auth.uid()
      OR public.is_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.vendor_applications va
        WHERE va.event_id = e.id
          AND va.user_id = auth.uid()
          AND va.application_status = 'approved'
          AND va.payment_status = 'paid'
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_event_private_details(uuid) TO authenticated;

-- ============================================================
-- 4. Venues: hide contact email / phone from general reads
-- ============================================================
DO $$
DECLARE
  cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position)
    INTO cols
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'venues'
    AND column_name NOT IN ('contact_email', 'contact_phone');

  EXECUTE 'REVOKE SELECT ON public.venues FROM anon, authenticated';
  EXECUTE format('GRANT SELECT (%s) ON public.venues TO anon, authenticated', cols);
END $$;

GRANT INSERT, UPDATE, DELETE ON public.venues TO authenticated;
GRANT ALL ON public.venues TO service_role;

CREATE OR REPLACE FUNCTION public.get_venue_contact(p_venue_id uuid)
RETURNS TABLE(contact_email text, contact_phone text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT v.contact_email, v.contact_phone
  FROM public.venues v
  WHERE v.id = p_venue_id
    AND (
      v.owner_id = auth.uid()
      OR public.is_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.venue_claims vc
        WHERE vc.venue_id = v.id
          AND vc.claimer_id = auth.uid()
          AND vc.status = 'approved'
          AND vc.claim_type IN ('owner', 'manager', 'editor')
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_venue_contact(uuid) TO authenticated;
