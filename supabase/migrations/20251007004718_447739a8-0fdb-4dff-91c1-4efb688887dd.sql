-- Create event_social_media table
CREATE TABLE public.event_social_media (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  platform text NOT NULL,
  url text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.event_social_media ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view event social media"
ON public.event_social_media
FOR SELECT
USING (true);

CREATE POLICY "Event organizers can manage their event social media"
ON public.event_social_media
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.events
    WHERE events.id = event_social_media.event_id
      AND events.organizer_id = auth.uid()
  )
);

-- Remove old social media columns from events table
ALTER TABLE public.events
DROP COLUMN IF EXISTS social_instagram,
DROP COLUMN IF EXISTS social_x,
DROP COLUMN IF EXISTS social_tiktok,
DROP COLUMN IF EXISTS social_linktree,
DROP COLUMN IF EXISTS social_facebook;