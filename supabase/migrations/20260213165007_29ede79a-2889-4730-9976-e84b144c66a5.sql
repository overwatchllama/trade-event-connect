
ALTER TABLE public.event_checklist_items 
ADD COLUMN assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL;
