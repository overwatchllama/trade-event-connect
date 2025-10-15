
-- Grant one year Vendor Pro subscription for testing
UPDATE subscribers 
SET 
  subscribed = true,
  subscription_tier = 'Vendor Pro',
  subscription_end = NOW() + INTERVAL '1 year',
  billing_period = 'yearly',
  stripe_customer_id = COALESCE(stripe_customer_id, 'test_customer_' || gen_random_uuid()::text),
  updated_at = NOW()
WHERE user_id = '0a96c905-0844-4bf6-bf90-3b0a119aad0f';

-- Grant all subscription-related roles for complete testing access
INSERT INTO user_roles (user_id, role)
VALUES ('0a96c905-0844-4bf6-bf90-3b0a119aad0f', 'sponsor')
ON CONFLICT (user_id, role) DO NOTHING;
