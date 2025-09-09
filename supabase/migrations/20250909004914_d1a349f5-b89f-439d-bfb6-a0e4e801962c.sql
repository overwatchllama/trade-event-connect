-- Create example vendor profiles for each event
INSERT INTO vendors (
  user_id,
  business_name,
  business_description,
  business_email,
  business_phone,
  business_address,
  specialties,
  rating,
  total_reviews,
  verified,
  website_url,
  social_instagram,
  social_facebook,
  avatar_url
) VALUES 
  -- Vendors for Pokemon TCG Championship Qualifier
  (
    '11111111-1111-1111-1111-111111111111',
    'Elite Pokemon Cards',
    'Premium Pokemon card dealer specializing in rare Base Set, Japanese exclusives, and tournament-grade cards. Official Pokemon distributor.',
    'sales@elitepokemoncards.com',
    '(555) 123-4567',
    '123 Pokemon Plaza, Trading City, CA 90210',
    ARRAY['Pokemon TCG', 'Japanese Cards', 'Tournament Cards'],
    4.9,
    127,
    true,
    'https://elitepokemoncards.com',
    '@elitepokemon',
    'ElitePokemonCards',
    '/placeholder.svg'
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Pika Power Trading',
    'Your go-to source for Pokemon singles, booster boxes, and exclusive merchandise. Competitive pricing guaranteed!',
    'hello@pikapower.com',
    '(555) 234-5678',
    '456 Electric Ave, Pallet Town, CA 90211',
    ARRAY['Pokemon Singles', 'Booster Boxes', 'Merchandise'],
    4.7,
    89,
    true,
    'https://pikapowertrading.com',
    '@pikapowertrading',
    'PikaPowerTrading',
    '/placeholder.svg'
  ),
  
  -- Vendors for Magic: The Gathering Modern Masters
  (
    '22222222-2222-2222-2222-222222222222',
    'Magic Kingdom Cards',
    'Premium Magic: The Gathering retailer featuring vintage cards, complete sets, and competitive decks for all formats.',
    'info@magickingdomcards.com',
    '(555) 345-6789',
    '789 Planeswalker Way, Magic City, TX 75201',
    ARRAY['Magic: The Gathering', 'Vintage Cards', 'Complete Sets'],
    4.8,
    156,
    true,
    'https://magickingdomcards.com',
    '@magickingdomcards',
    'MagicKingdomCards',
    '/placeholder.svg'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'Mana Vault Collectibles',
    'Specializing in high-value Magic singles, Reserved List cards, and tournament staples. Authentication guaranteed.',
    'contact@manavault.com',
    '(555) 456-7890',
    '321 Mana Drive, Dominaria, TX 75202',
    ARRAY['Reserved List', 'High Value Singles', 'Tournament Cards'],
    4.6,
    203,
    true,
    'https://manavaultcollectibles.com',
    '@manavaultcollect',
    'ManaVaultCollectibles',
    '/placeholder.svg'
  ),
  
  -- Vendors for Sports Card & Memorabilia Show
  (
    '33333333-3333-3333-3333-333333333333',
    'Sports Card Central',
    'Largest sports card inventory in Florida! Vintage baseball, modern basketball, football rookies, and signed memorabilia.',
    'sales@sportscardcentral.com',
    '(555) 567-8901',
    '654 Stadium Blvd, Sports City, FL 33101',
    ARRAY['Baseball Cards', 'Basketball Cards', 'Football Cards', 'Memorabilia'],
    4.5,
    341,
    true,
    'https://sportscardcentral.com',
    '@sportscardcentral',
    'SportsCardCentral',
    '/placeholder.svg'
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'Hall of Fame Sports',
    'Authentic sports memorabilia and vintage cards. Specializing in graded cards and authenticated autographs.',
    'info@hofpsorts.com',
    '(555) 678-9012',
    '987 Champion Lane, Victory City, FL 33102',
    ARRAY['Graded Cards', 'Autographs', 'Vintage Sports'],
    4.9,
    78,
    true,
    'https://halloffamesports.com',
    '@hofsports',
    'HallOfFameSports',
    '/placeholder.svg'
  ),
  
  -- Vendors for Yu-Gi-Oh! Duel Monsters Championship
  (
    '44444444-4444-4444-4444-444444444444',
    'Anime Card Paradise',
    'Your ultimate destination for Yu-Gi-Oh!, Dragon Ball Super, and anime-themed trading cards. Tournament supplies available.',
    'duel@animecardparadise.com',
    '(555) 789-0123',
    '111 Duel Academy Rd, Anime District, WA 98101',
    ARRAY['Yu-Gi-Oh', 'Dragon Ball Super', 'Anime Cards'],
    4.7,
    164,
    true,
    'https://animecardparadise.com',
    '@animecardparadise',
    'AnimeCardParadise',
    '/placeholder.svg'
  ),
  (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'Millennium Card Shop',
    'Professional Yu-Gi-Oh! singles and deck building service. Meta decks and budget builds available.',
    'shop@millenniumcards.com',
    '(555) 890-1234',
    '222 Pharaoh St, Duelist City, WA 98102',
    ARRAY['Yu-Gi-Oh Singles', 'Deck Building', 'Meta Decks'],
    4.8,
    92,
    true,
    'https://millenniumcardshop.com',
    '@millenniumcards',
    'MillenniumCardShop',
    '/placeholder.svg'
  ),
  
  -- Vendors for Nostalgic 90s Card Game Festival
  (
    '55555555-5555-5555-5555-555555555555',
    'Retro Gaming Cards',
    'Celebrating 90s nostalgia with original Pokemon Base Set, Magic Alpha/Beta, and other iconic vintage cards from the golden era.',
    'retro@retrogamingcards.com',
    '(555) 901-2345',
    '333 Memory Lane, Retro City, NY 10001',
    ARRAY['Retro Pokemon', 'Vintage Magic', '90s Promos', 'Nostalgia'],
    4.6,
    258,
    true,
    'https://retrogamingcards.com',
    '@retrogamingcards',
    'RetroGamingCards',
    '/placeholder.svg'
  ),
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    '90s Card Vault',
    'Authentic 90s trading cards in mint condition. Base Set Pokemon, Unlimited Magic, and rare promotional cards.',
    'vault@90scards.com',
    '(555) 012-3456',
    '444 Vintage Way, Nostalgia Town, NY 10002',
    ARRAY['Base Set Pokemon', 'Unlimited Magic', 'Promo Cards'],
    4.4,
    103,
    true,
    'https://90scardvault.com',
    '@90scardvault',
    '90sCardVault',
    '/placeholder.svg'
  );

-- Create vendor applications linking vendors to events
-- Get the event IDs first and then create applications
INSERT INTO vendor_applications (
  user_id,
  vendor_id,
  event_id,
  application_status,
  payment_status,
  application_date,
  approved_date,
  payment_date,
  table_number
)
SELECT 
  v.user_id,
  v.id as vendor_id,
  e.id as event_id,
  'approved'::vendor_application_status,
  'paid'::payment_status,
  current_date - interval '7 days',
  current_date - interval '5 days',
  current_date - interval '5 days',
  ROW_NUMBER() OVER (PARTITION BY e.id ORDER BY v.created_at)
FROM vendors v
CROSS JOIN events e
WHERE 
  -- Pokemon event vendors
  (e.title = 'Pokemon TCG Championship Qualifier' AND v.business_name IN ('Elite Pokemon Cards', 'Pika Power Trading'))
  OR
  -- Magic event vendors  
  (e.title = 'Magic: The Gathering Modern Masters' AND v.business_name IN ('Magic Kingdom Cards', 'Mana Vault Collectibles'))
  OR
  -- Sports event vendors
  (e.title = 'Sports Card & Memorabilia Show' AND v.business_name IN ('Sports Card Central', 'Hall of Fame Sports'))
  OR
  -- Yu-Gi-Oh event vendors
  (e.title = 'Yu-Gi-Oh! Duel Monsters Championship' AND v.business_name IN ('Anime Card Paradise', 'Millennium Card Shop'))
  OR
  -- Retro event vendors
  (e.title = 'Nostalgic 90s Card Game Festival' AND v.business_name IN ('Retro Gaming Cards', '90s Card Vault'));