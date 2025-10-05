-- Update the handle_new_user function to also create a default user role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  
  -- Insert default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'user'::user_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN new;
END;
$$;