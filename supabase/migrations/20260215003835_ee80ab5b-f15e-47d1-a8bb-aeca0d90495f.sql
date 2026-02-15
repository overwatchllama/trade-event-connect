
ALTER TABLE public.organizer_staff_roster
ADD COLUMN allow_vend BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL;
