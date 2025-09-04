-- Create storage bucket for event flyers
INSERT INTO storage.buckets (id, name, public) VALUES ('event-flyers', 'event-flyers', true);

-- Create storage policies for event flyers
CREATE POLICY "Anyone can view event flyers" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'event-flyers');

CREATE POLICY "Event organizers can upload flyers" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'event-flyers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Event organizers can update their flyers" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'event-flyers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Event organizers can delete their flyers" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'event-flyers' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create event_days table for multi-day events
CREATE TABLE public.event_days (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL,
    day_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    day_number INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on event_days
ALTER TABLE public.event_days ENABLE ROW LEVEL SECURITY;

-- Create policies for event_days
CREATE POLICY "Anyone can view event days" 
ON public.event_days 
FOR SELECT 
USING (true);

CREATE POLICY "Event organizers can manage their event days" 
ON public.event_days 
FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.events 
        WHERE events.id = event_days.event_id 
        AND events.organizer_id = auth.uid()
    )
);

-- Add foreign key constraint
ALTER TABLE public.event_days 
ADD CONSTRAINT fk_event_days_event_id 
FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

-- Create announcements table
CREATE TABLE public.event_announcements (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL,
    organizer_id UUID NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    target_audience TEXT NOT NULL CHECK (target_audience IN ('vendors', 'attendees', 'both')),
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on announcements
ALTER TABLE public.event_announcements ENABLE ROW LEVEL SECURITY;

-- Create policies for announcements
CREATE POLICY "Anyone can view event announcements" 
ON public.event_announcements 
FOR SELECT 
USING (true);

CREATE POLICY "Event organizers can create announcements for their events" 
ON public.event_announcements 
FOR INSERT 
WITH CHECK (
    auth.uid() = organizer_id AND
    EXISTS (
        SELECT 1 FROM public.events 
        WHERE events.id = event_announcements.event_id 
        AND events.organizer_id = auth.uid()
    )
);

CREATE POLICY "Event organizers can update their announcements" 
ON public.event_announcements 
FOR UPDATE 
USING (auth.uid() = organizer_id);

-- Add foreign key constraints for announcements
ALTER TABLE public.event_announcements 
ADD CONSTRAINT fk_event_announcements_event_id 
FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

ALTER TABLE public.event_announcements 
ADD CONSTRAINT fk_event_announcements_organizer_id 
FOREIGN KEY (organizer_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update events table to remove single time field and add flyer support
ALTER TABLE public.events DROP COLUMN IF EXISTS time;
ALTER TABLE public.events ADD COLUMN flyer_url TEXT;
ALTER TABLE public.events ADD COLUMN is_multi_day BOOLEAN NOT NULL DEFAULT false;

-- Create triggers for timestamp updates
CREATE TRIGGER update_event_days_updated_at
    BEFORE UPDATE ON public.event_days
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_event_announcements_updated_at
    BEFORE UPDATE ON public.event_announcements
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();