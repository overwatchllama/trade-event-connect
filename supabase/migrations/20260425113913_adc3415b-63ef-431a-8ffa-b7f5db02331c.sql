-- Demo snapshots: store JSON backup of test user data so we can restore weekly
CREATE TABLE public.demo_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.demo_snapshots ENABLE ROW LEVEL SECURITY;

-- Only admins can view/manage snapshots
CREATE POLICY "Admins can view snapshots"
  ON public.demo_snapshots FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can insert snapshots"
  ON public.demo_snapshots FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update snapshots"
  ON public.demo_snapshots FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can delete snapshots"
  ON public.demo_snapshots FOR DELETE
  USING (public.is_admin());

-- Helper: returns true if email is a test/demo account
CREATE OR REPLACE FUNCTION public.is_demo_email(_email text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT _email IS NOT NULL AND _email LIKE '%@test.com';
$$;