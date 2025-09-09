-- Create 5 example vendor users and profiles
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'vendor1@example.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"full_name": "Alex Johnson"}'),
  ('22222222-2222-2222-2222-222222222222', 'vendor2@example.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"full_name": "Sarah Chen"}'),
  ('33333333-3333-3333-3333-333333333333', 'vendor3@example.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"full_name": "Mike Rodriguez"}'),
  ('44444444-4444-4444-4444-444444444444', 'vendor4@example.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"full_name": "Emma Thompson"}'),
  ('55555555-5555-5555-5555-555555555555', 'vendor5@example.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"full_name": "David Kim"}')
ON CONFLICT DO NOTHING;

-- Create profiles for the vendor users
INSERT INTO profiles (id, email, full_name, role, created_at, updated_at)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'vendor1@example.com', 'Alex Johnson', 'vendor', now(), now()),
  ('22222222-2222-2222-2222-222222222222', 'vendor2@example.com', 'Sarah Chen', 'vendor', now(), now()),
  ('33333333-3333-3333-3333-333333333333', 'vendor3@example.com', 'Mike Rodriguez', 'vendor', now(), now()),
  ('44444444-4444-4444-4444-444444444444', 'vendor4@example.com', 'Emma Thompson', 'vendor', now(), now()),
  ('55555555-5555-5555-5555-555555555555', 'vendor5@example.com', 'David Kim', 'vendor', now(), now())
ON CONFLICT DO NOTHING;

-- Create vendor business profiles
INSERT INTO vendors (
  user_id, 
  business_name, 
  business_description, 
  business_address, 
  business_phone, 
  business_email, 
  website_url, 
  specialties, 
  verified,
  rating,
  total_reviews
) VALUES 
  (
    '11111111-1111-1111-1111-111111111111',
    'Elite Pokemon Cards',
    'Specializing in rare and vintage Pokemon cards since 2010. We authenticate all our products and offer competitive prices for collectors worldwide.',
    '456 Collector Ave, Trading City, CA 90210',
    '(555) 234-5678',
    'contact@elitepokemon.com',
    'https://elitepokemon.com',
    ARRAY['Pokemon', 'Japanese Cards', 'Graded Cards', 'Base Set'],
    true,
    4.8,
    156
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Magic Kingdom Cards',
    'Your trusted source for Magic: The Gathering cards. From Standard to Legacy, we have singles, sealed products, and deck building services.',
    '789 Wizard St, Planeswalker Town, TX 75201',
    '(555) 345-6789',
    'sarah@magickingdom.com',
    'https://magickingdomcards.com',
    ARRAY['Magic: The Gathering', 'Reserved List', 'Vintage', 'Commander'],
    true,
    4.9,
    203
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'Sports Card Central',
    'Premier destination for sports cards including baseball, basketball, football, and soccer. We specialize in modern rookies and hall of fame legends.',
    '321 Stadium Blvd, Sports City, FL 33101',
    '(555) 456-7890',
    'mike@sportscentral.com',
    'https://sportscardcentral.com',
    ARRAY['Baseball Cards', 'Basketball Cards', 'Football Cards', 'Rookie Cards'],
    true,
    4.7,
    98
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    'Anime Card Paradise',
    'Everything anime cards! From Dragon Ball Z to One Piece, Yu-Gi-Oh to Digimon. We import directly from Japan for the latest releases.',
    '654 Otaku Lane, Anime District, WA 98101',
    '(555) 567-8901',
    'emma@animecard.com',
    'https://animecardparadise.com',
    ARRAY['Yu-Gi-Oh', 'Dragon Ball Z', 'One Piece', 'Japanese Imports'],
    false,
    0,
    0
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    'Retro Gaming Cards',
    'Nostalgic gaming cards from the 90s and 2000s. Pokemon, Digimon, Monster Rancher, and many more forgotten gems from gaming history.',
    '987 Nostalgia Road, Retro City, NY 10001',
    '(555) 678-9012',
    'david@retrogaming.com',
    'https://retrogamingcards.com',
    ARRAY['Retro Pokemon', 'Digimon', 'Monster Rancher', '90s Cards'],
    true,
    4.6,
    67
  )
ON CONFLICT DO NOTHING;