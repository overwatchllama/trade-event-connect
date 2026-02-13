
-- 1. Drop overly permissive notifications INSERT policy
-- Triggers use SECURITY DEFINER so they bypass RLS entirely
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- 2. Add server-side expiration check to invite code redemption policy
DROP POLICY IF EXISTS "Users can claim invite codes" ON public.vendor_employees;

CREATE POLICY "Users can claim invite codes"
ON public.vendor_employees FOR UPDATE
USING (
  invite_code IS NOT NULL 
  AND user_id IS NULL
  AND (invite_expires_at IS NULL OR invite_expires_at > now())
)
WITH CHECK (auth.uid() = user_id);
