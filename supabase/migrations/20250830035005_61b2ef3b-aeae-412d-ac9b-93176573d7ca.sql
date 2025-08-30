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