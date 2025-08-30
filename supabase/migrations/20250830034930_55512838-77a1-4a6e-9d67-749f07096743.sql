-- Create a vendors table for business information
CREATE TABLE public.vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  business_name text NOT NULL,
  business_description text,
  business_address text,
  business_phone text,
  business_email text,
  website_url text,
  specialties text[], -- Array of TCG specialties like ['pokemon', 'mtg', 'lorcana']
  verified boolean DEFAULT false,
  rating numeric(2,1) DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 5),
  total_reviews integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for vendors
CREATE POLICY "Vendors can view all vendor profiles" 
ON public.vendors 
FOR SELECT 
USING (true);

CREATE POLICY "Vendors can update their own profile" 
ON public.vendors 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own vendor profile" 
ON public.vendors 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_vendors_updated_at
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create some test vendor profiles and users
-- Note: These will be placeholder entries since we can't create actual auth.users entries via SQL
-- In a real scenario, these would be created through the authentication flow

-- Insert test profiles (these represent the test vendors)
INSERT INTO public.profiles (id, email, full_name, role) VALUES 
  ('550e8400-e29b-41d4-a716-446655440001', 'cardmaster@tcgstore.com', 'CardMaster Pro Shop', 'vendor'),
  ('550e8400-e29b-41d4-a716-446655440002', 'pokemon.palace@email.com', 'Pokemon Palace', 'vendor'),
  ('550e8400-e29b-41d4-a716-446655440003', 'magic.emporium@email.com', 'Magic Card Emporium', 'vendor'),
  ('550e8400-e29b-41d4-a716-446655440004', 'collectors.corner@email.com', 'Collector''s Corner', 'vendor'),
  ('550e8400-e29b-41d4-a716-446655440005', 'elite.cards@email.com', 'Elite Card Traders', 'vendor'),
  ('550e8400-e29b-41d4-a716-446655440006', 'vintage.vault@email.com', 'Vintage Card Vault', 'vendor');

-- Insert corresponding vendor business information
INSERT INTO public.vendors (user_id, business_name, business_description, business_address, business_phone, business_email, website_url, specialties, verified, rating, total_reviews) VALUES 
  (
    '550e8400-e29b-41d4-a716-446655440001',
    'CardMaster Pro Shop',
    'Your one-stop shop for all trading card games. We specialize in competitive play and tournament-grade cards.',
    '123 Main Street, Cardtown, CT 06001',
    '(555) 123-4567',
    'info@cardmasterpro.com',
    'https://cardmasterpro.com',
    ARRAY['pokemon', 'mtg', 'lorcana', 'onepiece'],
    true,
    4.8,
    156
  ),
  (
    '550e8400-e29b-41d4-a716-446655440002',
    'Pokemon Palace',
    'Dedicated to all things Pokemon! From vintage Base Set to the latest releases.',
    '456 Pokemon Ave, Pallet Town, PA 19001',
    '(555) 234-5678',
    'shop@pokemonpalace.com',
    'https://pokemonpalace.com',
    ARRAY['pokemon'],
    true,
    4.9,
    203
  ),
  (
    '550e8400-e29b-41d4-a716-446655440003',
    'Magic Card Emporium',
    'Premium Magic: The Gathering cards and supplies. 25+ years of experience.',
    '789 Planeswalker Blvd, Dominaria, MA 02101',
    '(555) 345-6789',
    'contact@magicemporium.com',
    'https://magicemporium.com',
    ARRAY['mtg'],
    true,
    4.7,
    98
  ),
  (
    '550e8400-e29b-41d4-a716-446655440004',
    'Collector''s Corner',
    'Family-owned business specializing in Disney Lorcana and collectible card games.',
    '321 Disney Drive, Enchanted Forest, FL 32801',
    '(555) 456-7890',
    'hello@collectorscorner.com',
    'https://collectorscorner.com',
    ARRAY['lorcana', 'pokemon'],
    false,
    4.6,
    67
  ),
  (
    '550e8400-e29b-41d4-a716-446655440005',
    'Elite Card Traders',
    'High-end trading cards and rare collectibles. Investment-grade cards our specialty.',
    '654 Treasure Street, Goldport, CA 90210',
    '(555) 567-8901',
    'sales@elitecardtraders.com',
    'https://elitecardtraders.com',
    ARRAY['pokemon', 'mtg', 'onepiece'],
    true,
    4.9,
    134
  ),
  (
    '550e8400-e29b-41d4-a716-446655440006',
    'Vintage Card Vault',
    'Specializing in vintage and retro trading cards. Grading and authentication services available.',
    '987 Nostalgia Lane, Retro City, NY 10001',
    '(555) 678-9012',
    'info@vintagecardvault.com',
    'https://vintagecardvault.com',
    ARRAY['pokemon', 'mtg'],
    true,
    4.5,
    89
  );