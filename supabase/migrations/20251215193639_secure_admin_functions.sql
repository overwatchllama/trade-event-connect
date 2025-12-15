-- Secure admin functions to prevent IDOR vulnerabilities
-- These functions verify admin status server-side before allowing operations

-- Function to securely add user role
CREATE OR REPLACE FUNCTION public.admin_add_user_role(
  target_user_id UUID,
  user_role TEXT
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  calling_user_id UUID;
BEGIN
  -- Get the calling user's ID
  calling_user_id := auth.uid();
  
  -- Verify caller is admin
  IF NOT public.is_admin(calling_user_id) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  -- Add the role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, user_role::TEXT);
  
  -- Log the admin action
  INSERT INTO public.admin_actions (admin_id, target_user_id, action, details)
  VALUES (calling_user_id, target_user_id, 'role_added', jsonb_build_object('role', user_role));
  
  RETURN jsonb_build_object('success', true);
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'User already has this role';
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to add role: %', SQLERRM;
END;
$$;

-- Function to securely remove user role
CREATE OR REPLACE FUNCTION public.admin_remove_user_role(
  target_user_id UUID,
  user_role TEXT
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  calling_user_id UUID;
BEGIN
  calling_user_id := auth.uid();
  
  IF NOT public.is_admin(calling_user_id) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  DELETE FROM public.user_roles
  WHERE user_id = target_user_id AND role = user_role::TEXT;
  
  INSERT INTO public.admin_actions (admin_id, target_user_id, action, details)
  VALUES (calling_user_id, target_user_id, 'role_removed', jsonb_build_object('role', user_role));
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- Function to securely block user
CREATE OR REPLACE FUNCTION public.admin_block_user(
  target_user_id UUID,
  block_reason TEXT
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  calling_user_id UUID;
BEGIN
  calling_user_id := auth.uid();
  
  IF NOT public.is_admin(calling_user_id) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  UPDATE public.profiles
  SET 
    status = 'blocked',
    blocked_at = NOW(),
    blocked_by = calling_user_id,
    block_reason = block_reason
  WHERE id = target_user_id;
  
  INSERT INTO public.admin_actions (admin_id, target_user_id, action, details)
  VALUES (calling_user_id, target_user_id, 'user_blocked', jsonb_build_object('reason', block_reason));
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- Function to securely unblock user
CREATE OR REPLACE FUNCTION public.admin_unblock_user(
  target_user_id UUID
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  calling_user_id UUID;
BEGIN
  calling_user_id := auth.uid();
  
  IF NOT public.is_admin(calling_user_id) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  UPDATE public.profiles
  SET 
    status = 'active',
    blocked_at = NULL,
    blocked_by = NULL,
    block_reason = NULL
  WHERE id = target_user_id;
  
  INSERT INTO public.admin_actions (admin_id, target_user_id, action, details)
  VALUES (calling_user_id, target_user_id, 'user_unblocked', jsonb_build_object());
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- Function to securely approve role request
CREATE OR REPLACE FUNCTION public.admin_approve_role_request(
  request_id UUID,
  is_approved BOOLEAN,
  admin_notes TEXT DEFAULT NULL
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  calling_user_id UUID;
BEGIN
  calling_user_id := auth.uid();
  
  IF NOT public.is_admin(calling_user_id) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  UPDATE public.role_requests
  SET 
    status = CASE WHEN is_approved THEN 'approved' ELSE 'rejected' END,
    admin_notes = COALESCE(admin_notes, admin_notes)
  WHERE id = request_id;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.admin_add_user_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_remove_user_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_block_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_unblock_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_approve_role_request TO authenticated;
