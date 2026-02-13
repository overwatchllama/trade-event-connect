
CREATE TABLE public.event_checklist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.event_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event organizers can manage their checklist items"
ON public.event_checklist_items
FOR ALL
USING (EXISTS (
  SELECT 1 FROM events WHERE events.id = event_checklist_items.event_id AND events.organizer_id = auth.uid()
));

CREATE TRIGGER update_event_checklist_items_updated_at
BEFORE UPDATE ON public.event_checklist_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
