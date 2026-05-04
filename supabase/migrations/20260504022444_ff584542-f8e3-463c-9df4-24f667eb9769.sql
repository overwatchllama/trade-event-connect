
-- Hide event/venue contact info from anonymous (unauthenticated) users via column-level grants.
-- RLS still allows public read of non-contact fields; contact details require login.
REVOKE SELECT (contact_email, contact_phone, preferred_contact_method) ON public.events FROM anon;
REVOKE SELECT (contact_email, contact_phone) ON public.venues FROM anon;
