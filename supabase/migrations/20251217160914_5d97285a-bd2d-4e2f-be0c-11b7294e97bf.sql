-- Allow favorites in subscriptions
ALTER TABLE public.user_subscriptions
  DROP CONSTRAINT IF EXISTS user_subscriptions_subscription_type_check;

ALTER TABLE public.user_subscriptions
  ADD CONSTRAINT user_subscriptions_subscription_type_check
  CHECK (subscription_type = ANY (ARRAY['vendor'::text, 'event'::text, 'favorite_vendor'::text]));
