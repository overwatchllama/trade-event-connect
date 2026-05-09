
-- Revoke direct read access to the amount column for everyone
REVOKE SELECT (amount) ON public.event_sponsors FROM anon, authenticated;

-- Organizer-only access to sponsor amounts via SECURITY DEFINER function
CREATE OR REPLACE FUNCTION public.get_event_sponsor_amounts(p_event_id uuid)
RETURNS TABLE (id uuid, amount numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT es.id, es.amount
  FROM public.event_sponsors es
  JOIN public.events e ON e.id = es.event_id
  WHERE es.event_id = p_event_id
    AND e.organizer_id = auth.uid();
$$;

REVOKE EXECUTE ON FUNCTION public.get_event_sponsor_amounts(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_event_sponsor_amounts(uuid) TO authenticated;
