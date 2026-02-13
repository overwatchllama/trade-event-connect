ALTER TABLE public.event_staff_assignments
  ADD COLUMN checked_in BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN checked_in_at TIMESTAMPTZ,
  ADD COLUMN checked_out_at TIMESTAMPTZ;