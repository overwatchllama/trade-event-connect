-- First drop ALL foreign key constraints to auth.users on both tables
ALTER TABLE public.vendors DROP CONSTRAINT IF EXISTS vendors_user_id_fkey;
ALTER TABLE public.vendor_applications DROP CONSTRAINT IF EXISTS fk_vendor_applications_user_id;
ALTER TABLE public.vendor_applications DROP CONSTRAINT IF EXISTS vendor_applications_user_id_fkey;

-- Create 20 test vendors and apply them to the "My house" event
DO $$
DECLARE
  event_id uuid := '4a8cec33-d72d-424f-9ea7-2c809f157d01';
  new_user_id uuid;
  new_vendor_id uuid;
  vendor_name text;
  vendor_desc text;
  vendor_email text;
  app_status vendor_application_status;
  pay_status payment_status;
  i int;
BEGIN
  FOR i IN 1..20 LOOP
    new_user_id := gen_random_uuid();
    new_vendor_id := gen_random_uuid();
    
    CASE i
      WHEN 1 THEN vendor_name := 'Card Kingdom Central'; vendor_desc := 'Premier destination for Pokemon and Magic cards';
      WHEN 2 THEN vendor_name := 'Mint Condition Cards'; vendor_desc := 'Specializing in graded cards and sealed products';
      WHEN 3 THEN vendor_name := 'Elite Trading Co'; vendor_desc := 'High-end singles and vintage collectibles';
      WHEN 4 THEN vendor_name := 'Dragon Scale Collectibles'; vendor_desc := 'Yu-Gi-Oh and Dragon Ball specialists';
      WHEN 5 THEN vendor_name := 'Rare Finds TCG'; vendor_desc := 'Rare and hard-to-find trading cards';
      WHEN 6 THEN vendor_name := 'Victory Lap Games'; vendor_desc := 'Sports cards and gaming memorabilia';
      WHEN 7 THEN vendor_name := 'Prismatic Cards'; vendor_desc := 'Holographic and special edition cards';
      WHEN 8 THEN vendor_name := 'Mythic Treasures'; vendor_desc := 'Mythic rare and chase card experts';
      WHEN 9 THEN vendor_name := 'Champion Cards'; vendor_desc := 'Tournament-ready decks and singles';
      WHEN 10 THEN vendor_name := 'Legendary Pulls'; vendor_desc := 'Box breaks and case hits specialists';
      WHEN 11 THEN vendor_name := 'Crystal Clear Cards'; vendor_desc := 'Near-mint and gem condition cards only';
      WHEN 12 THEN vendor_name := 'Nova Trading'; vendor_desc := 'New releases and pre-orders available';
      WHEN 13 THEN vendor_name := 'Apex Collectibles'; vendor_desc := 'Apex predator of the card market';
      WHEN 14 THEN vendor_name := 'Thunder Bay Cards'; vendor_desc := 'Canadian imports and exclusives';
      WHEN 15 THEN vendor_name := 'Golden Era Games'; vendor_desc := 'Vintage and retro gaming cards';
      WHEN 16 THEN vendor_name := 'Silver Lining TCG'; vendor_desc := 'Budget-friendly options for all collectors';
      WHEN 17 THEN vendor_name := 'Cosmic Cards'; vendor_desc := 'Out-of-this-world card selection';
      WHEN 18 THEN vendor_name := 'Ironclad Gaming'; vendor_desc := 'Metal and premium card variants';
      WHEN 19 THEN vendor_name := 'Phoenix Rising Cards'; vendor_desc := 'Rising from the ashes with great deals';
      WHEN 20 THEN vendor_name := 'Diamond Deck Trading'; vendor_desc := 'Diamond in the rough finds daily';
    END CASE;
    
    vendor_email := lower(replace(vendor_name, ' ', '')) || '@example.com';
    
    CASE i
      WHEN 1, 6, 10, 15, 19 THEN app_status := 'pending';
      WHEN 5, 13 THEN app_status := 'waitlist';
      WHEN 8, 17 THEN app_status := 'rejected';
      ELSE app_status := 'approved';
    END CASE;
    
    IF app_status = 'approved' AND i % 2 = 0 THEN
      pay_status := 'paid';
    ELSE
      pay_status := 'unpaid';
    END IF;
    
    INSERT INTO public.vendors (
      id, user_id, business_name, business_description, business_email, 
      business_phone, specialties, vendor_types, rating, total_reviews, verified
    ) VALUES (
      new_vendor_id,
      new_user_id,
      vendor_name,
      vendor_desc,
      vendor_email,
      '555-' || lpad((1000 + i)::text, 4, '0'),
      ARRAY['Pokemon', 'Magic: The Gathering'],
      ARRAY['Cards', 'Singles'],
      3.5 + (random() * 1.5),
      floor(random() * 50 + 5)::int,
      i <= 10
    );
    
    INSERT INTO public.vendor_applications (
      event_id, vendor_id, user_id, application_status, payment_status, 
      requested_tables, notes
    ) VALUES (
      event_id,
      new_vendor_id,
      new_user_id,
      app_status,
      pay_status,
      floor(random() * 3 + 1)::int,
      'Test vendor application for ' || vendor_name
    );
  END LOOP;
END $$;