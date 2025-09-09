-- Use existing organizer IDs from events to create vendor profiles
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
)
SELECT 
  e.organizer_id,
  CASE 
    WHEN e.title = 'Pokemon TCG Championship Qualifier' THEN 'Elite Pokemon Cards'
    WHEN e.title = 'Magic: The Gathering Modern Masters' THEN 'Magic Kingdom Cards'
    WHEN e.title = 'Sports Card & Memorabilia Show' THEN 'Sports Card Central'
    WHEN e.title = 'Yu-Gi-Oh! Duel Monsters Championship' THEN 'Anime Card Paradise'
    WHEN e.title = 'Nostalgic 90s Card Game Festival' THEN 'Retro Gaming Cards'
    ELSE 'Trading Card Vendor'
  END as business_name,
  CASE 
    WHEN e.title = 'Pokemon TCG Championship Qualifier' THEN 'Premium Pokemon card dealer specializing in rare Base Set, Japanese exclusives, and tournament-grade cards.'
    WHEN e.title = 'Magic: The Gathering Modern Masters' THEN 'Premium Magic: The Gathering retailer featuring vintage cards, complete sets, and competitive decks.'
    WHEN e.title = 'Sports Card & Memorabilia Show' THEN 'Largest sports card inventory! Vintage baseball, modern basketball, football rookies, and signed memorabilia.'
    WHEN e.title = 'Yu-Gi-Oh! Duel Monsters Championship' THEN 'Your ultimate destination for Yu-Gi-Oh!, Dragon Ball Super, and anime-themed trading cards.'
    WHEN e.title = 'Nostalgic 90s Card Game Festival' THEN 'Celebrating 90s nostalgia with original Pokemon Base Set, Magic Alpha/Beta, and other iconic vintage cards.'
    ELSE 'Professional trading card vendor with quality inventory.'
  END as business_description,
  'contact@' || lower(replace(e.organizer_name, ' ', '')) || '.com' as business_email,
  '(555) 123-' || (1000 + (extract(epoch from e.created_at)::int % 9000))::text as business_phone,
  e.address as business_address,
  e.card_types as specialties,
  4.5 + (random() * 0.5) as rating,
  (50 + (random() * 200))::int as total_reviews,
  true as verified,
  'https://' || lower(replace(e.organizer_name, ' ', '')) || '.com' as website_url,
  '@' || lower(replace(e.organizer_name, ' ', '')) as social_instagram,
  e.organizer_name as social_facebook,
  '/placeholder.svg' as avatar_url
FROM events e
WHERE NOT EXISTS (
  SELECT 1 FROM vendors v WHERE v.user_id = e.organizer_id
)
ON CONFLICT (user_id) DO NOTHING;