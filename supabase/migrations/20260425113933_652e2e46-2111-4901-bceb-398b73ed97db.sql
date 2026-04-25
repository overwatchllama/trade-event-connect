CREATE OR REPLACE FUNCTION public.is_demo_email(_email text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT _email IS NOT NULL AND _email LIKE '%@test.com';
$$;