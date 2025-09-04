-- Create events table
CREATE TABLE public.events (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    venue TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip_code TEXT NOT NULL,
    event_type TEXT NOT NULL,
    card_types TEXT[] NOT NULL DEFAULT '{}',
    max_attendees INTEGER,
    entry_fee NUMERIC,
    vendor_table_price NUMERIC,
    total_tables INTEGER,
    tables_available INTEGER,
    organizer_id UUID NOT NULL,
    organizer_name TEXT NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Create policies for events
CREATE POLICY "Anyone can view events" 
ON public.events 
FOR SELECT 
USING (true);

CREATE POLICY "Organizers can create their own events" 
ON public.events 
FOR INSERT 
WITH CHECK (auth.uid() = organizer_id);

CREATE POLICY "Organizers can update their own events" 
ON public.events 
FOR UPDATE 
USING (auth.uid() = organizer_id);

CREATE POLICY "Organizers can delete their own events" 
ON public.events 
FOR DELETE 
USING (auth.uid() = organizer_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON public.events
    FOR EACH ROW
    EXECUTE FUNCTION public.update_events_updated_at();

-- Add foreign key constraint to users table
ALTER TABLE public.events 
ADD CONSTRAINT fk_events_organizer_id 
FOREIGN KEY (organizer_id) REFERENCES auth.users(id) ON DELETE CASCADE;