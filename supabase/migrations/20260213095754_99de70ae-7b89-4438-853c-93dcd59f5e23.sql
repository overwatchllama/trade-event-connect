
-- Fix 1: Lock down subscribers table - only service role should modify, users can only read their own
DROP POLICY IF EXISTS "update_own_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "insert_subscription" ON public.subscribers;

-- Ensure users can only SELECT their own subscription
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscribers;
CREATE POLICY "Users can view own subscription"
ON public.subscribers
FOR SELECT
USING (user_id = auth.uid() OR email = auth.jwt()->>'email');
