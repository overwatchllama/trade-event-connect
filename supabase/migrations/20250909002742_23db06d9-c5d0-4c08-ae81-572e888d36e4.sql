-- Create a test vendor profile for christopher.mllr@gmail.com
INSERT INTO vendors (
  user_id,
  business_name,
  business_description,
  business_address,
  business_phone,
  business_email,
  website_url,
  specialties,
  verified
)
SELECT 
  p.id,
  'Test Trading Cards',
  'A premium trading card vendor specializing in rare Pokemon, Magic: The Gathering, and sports cards. We offer authentication services and have been in business for over 10 years.',
  '123 Card Shop Lane, Collector City, CA 90210',
  '(555) 123-CARD',
  'info@testtradingcards.com',
  'https://testtradingcards.com',
  ARRAY['Pokemon', 'Magic: The Gathering', 'Sports Cards', 'Authentication'],
  true
FROM profiles p 
WHERE p.email = 'christopher.mllr@gmail.com' AND p.role = 'vendor'
ON CONFLICT DO NOTHING;