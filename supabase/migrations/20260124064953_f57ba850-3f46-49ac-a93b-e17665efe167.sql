-- Create 10 events with 20 vendors each for event@test.com
DO $$
DECLARE
  organizer_id uuid := 'e35aa19d-36e4-4bfb-a1a2-4763f1066611';
  event_names text[] := ARRAY[
    'Pokemon Championship Series',
    'Magic the Gathering Grand Prix', 
    'Yu-Gi-Oh Regional Tournament',
    'Dragon Ball Super Card Games',
    'Sports Card Expo 2025',
    'Vintage Card Collector Fair',
    'One Piece Card Game Launch',
    'Lorcana Trading Card Event',
    'Multi-TCG Mega Show',
    'Card Collectors Convention'
  ];
  event_descs text[] := ARRAY[
    'The ultimate Pokemon TCG competition with top players',
    'Competitive Magic event with prizes and side events',
    'Regional qualifier for Yu-Gi-Oh championships',
    'Dragon Ball Super card game tournament and trading',
    'Sports memorabilia and trading cards showcase',
    'Rare vintage cards from all eras',
    'Official One Piece card game launch celebration',
    'Disney Lorcana trading and tournament event',
    'Multiple TCG games under one roof',
    'Annual convention for serious collectors'
  ];
  cities text[] := ARRAY['Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'Austin', 'Denver'];
  states text[] := ARRAY['CA', 'IL', 'TX', 'AZ', 'PA', 'TX', 'CA', 'TX', 'TX', 'CO'];
  vendor_prefixes text[] := ARRAY['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa', 'Lambda', 'Mu', 'Nu', 'Xi', 'Omicron', 'Pi', 'Rho', 'Sigma', 'Tau', 'Upsilon'];
  vendor_suffixes text[] := ARRAY['Cards', 'Trading', 'Collectibles', 'Games', 'TCG', 'Shop', 'Emporium', 'Vault', 'Den', 'Hub', 'Exchange', 'Market', 'Store', 'Zone', 'Central', 'Depot', 'Outlet', 'Corner', 'Place', 'Gallery'];
  new_event_id uuid;
  new_vendor_id uuid;
  new_user_id uuid;
  event_date date;
  app_status vendor_application_status;
  pay_status payment_status;
  i int;
  j int;
BEGIN
  FOR i IN 1..10 LOOP
    new_event_id := gen_random_uuid();
    event_date := CURRENT_DATE + (i * 14);
    
    -- Create event
    INSERT INTO public.events (
      id, organizer_id, title, description, date, venue, address, city, state, zip_code,
      event_type, card_types, organizer_name, vendor_table_price, total_tables, tables_available
    ) VALUES (
      new_event_id,
      organizer_id,
      event_names[i],
      event_descs[i],
      to_char(event_date, 'YYYY-MM-DD'),
      'Convention Center ' || i,
      (100 + i * 10)::text || ' Main Street',
      cities[i],
      states[i],
      lpad((10000 + i * 1111)::text, 5, '0'),
      CASE WHEN i <= 4 THEN 'tournament' WHEN i <= 7 THEN 'trade_show' ELSE 'convention' END,
      CASE 
        WHEN i = 1 THEN ARRAY['Pokemon']
        WHEN i = 2 THEN ARRAY['Magic: The Gathering']
        WHEN i = 3 THEN ARRAY['Yu-Gi-Oh']
        WHEN i = 4 THEN ARRAY['Dragon Ball Super']
        WHEN i = 5 THEN ARRAY['Sports Cards']
        WHEN i = 6 THEN ARRAY['Pokemon', 'Magic: The Gathering', 'Yu-Gi-Oh']
        WHEN i = 7 THEN ARRAY['One Piece']
        WHEN i = 8 THEN ARRAY['Lorcana']
        ELSE ARRAY['Pokemon', 'Magic: The Gathering', 'Yu-Gi-Oh', 'Sports Cards']
      END,
      'Event Organizer',
      50 + (i * 10),
      50,
      50
    );
    
    -- Create event day
    INSERT INTO public.event_days (event_id, day_date, start_time, end_time, day_number)
    VALUES (new_event_id, event_date, '09:00', '18:00', 1);
    
    -- Create 20 vendors for this event
    FOR j IN 1..20 LOOP
      new_vendor_id := gen_random_uuid();
      new_user_id := gen_random_uuid();
      
      -- Determine application status
      CASE 
        WHEN j <= 10 THEN app_status := 'approved';
        WHEN j <= 14 THEN app_status := 'pending';
        WHEN j <= 16 THEN app_status := 'waitlist';
        ELSE app_status := 'rejected';
      END CASE;
      
      -- Determine payment status
      IF app_status = 'approved' AND j <= 7 THEN
        pay_status := 'paid';
      ELSE
        pay_status := 'unpaid';
      END IF;
      
      -- Create vendor
      INSERT INTO public.vendors (
        id, user_id, business_name, business_description, business_email, 
        business_phone, specialties, vendor_types, rating, total_reviews, verified
      ) VALUES (
        new_vendor_id,
        new_user_id,
        vendor_prefixes[j] || ' ' || vendor_suffixes[j] || ' E' || i,
        'Quality trading cards and collectibles for event ' || i,
        lower(vendor_prefixes[j] || vendor_suffixes[j] || 'e' || i) || '@example.com',
        '555-' || lpad((i * 100 + j)::text, 4, '0'),
        ARRAY['Pokemon', 'Magic: The Gathering'],
        ARRAY['Cards', 'Singles'],
        3.0 + (random() * 2.0),
        floor(random() * 100 + 1)::int,
        j <= 5
      );
      
      -- Create vendor application
      INSERT INTO public.vendor_applications (
        event_id, vendor_id, user_id, application_status, payment_status, 
        requested_tables, notes
      ) VALUES (
        new_event_id,
        new_vendor_id,
        new_user_id,
        app_status,
        pay_status,
        floor(random() * 3 + 1)::int,
        'Application for ' || event_names[i]
      );
    END LOOP;
  END LOOP;
END $$;