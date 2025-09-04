-- Create enum for vendor application status
CREATE TYPE public.vendor_application_status AS ENUM ('pending', 'approved', 'rejected');

-- Create enum for payment status
CREATE TYPE public.payment_status AS ENUM ('unpaid', 'paid', 'refunded');

-- Create vendor_applications table
CREATE TABLE public.vendor_applications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id TEXT NOT NULL,
    vendor_id UUID NOT NULL,
    user_id UUID NOT NULL,
    application_status vendor_application_status NOT NULL DEFAULT 'pending',
    payment_status payment_status NOT NULL DEFAULT 'unpaid',
    application_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    approved_date TIMESTAMP WITH TIME ZONE,
    payment_date TIMESTAMP WITH TIME ZONE,
    stripe_payment_intent_id TEXT,
    table_number INTEGER,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.vendor_applications ENABLE ROW LEVEL SECURITY;

-- Create policies for vendor applications
CREATE POLICY "Vendors can view their own applications" 
ON public.vendor_applications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Vendors can create their own applications" 
ON public.vendor_applications 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Vendors can update their own applications" 
ON public.vendor_applications 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create policy for event organizers to view applications for their events
CREATE POLICY "Event organizers can view applications for their events" 
ON public.vendor_applications 
FOR SELECT 
USING (true); -- This will be refined based on event ownership logic

-- Create policy for event organizers to update applications for their events
CREATE POLICY "Event organizers can update applications for their events" 
ON public.vendor_applications 
FOR UPDATE 
USING (true); -- This will be refined based on event ownership logic

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_vendor_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_vendor_applications_updated_at
    BEFORE UPDATE ON public.vendor_applications
    FOR EACH ROW
    EXECUTE FUNCTION public.update_vendor_applications_updated_at();

-- Add foreign key constraint to vendors table
ALTER TABLE public.vendor_applications 
ADD CONSTRAINT fk_vendor_applications_vendor_id 
FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;

-- Add foreign key constraint to users table
ALTER TABLE public.vendor_applications 
ADD CONSTRAINT fk_vendor_applications_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;