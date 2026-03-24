
-- Raffle items: prizes created by organizers
CREATE TABLE public.raffle_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  organizer_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  image_url text,
  entry_method text NOT NULL DEFAULT 'auto' CHECK (entry_method IN ('auto', 'opt_in')),
  claim_time_seconds integer NOT NULL DEFAULT 120,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'drawn', 'claimed', 'expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Raffle entries: who entered which raffle
CREATE TABLE public.raffle_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raffle_item_id uuid NOT NULL REFERENCES public.raffle_items(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  entered_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(raffle_item_id, user_id)
);

-- Raffle draws: winner records
CREATE TABLE public.raffle_draws (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raffle_item_id uuid NOT NULL REFERENCES public.raffle_items(id) ON DELETE CASCADE,
  winner_user_id uuid NOT NULL,
  drawn_at timestamptz NOT NULL DEFAULT now(),
  claim_deadline timestamptz NOT NULL,
  claimed_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.raffle_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raffle_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raffle_draws ENABLE ROW LEVEL SECURITY;

-- raffle_items policies
CREATE POLICY "Anyone can view raffle items for events" ON public.raffle_items FOR SELECT USING (true);
CREATE POLICY "Organizers can manage their event raffle items" ON public.raffle_items FOR ALL USING (
  EXISTS (SELECT 1 FROM events WHERE events.id = raffle_items.event_id AND events.organizer_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM events WHERE events.id = raffle_items.event_id AND events.organizer_id = auth.uid())
);

-- raffle_entries policies
CREATE POLICY "Users can view their own raffle entries" ON public.raffle_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Organizers can view entries for their events" ON public.raffle_entries FOR SELECT USING (
  EXISTS (SELECT 1 FROM raffle_items ri JOIN events e ON e.id = ri.event_id WHERE ri.id = raffle_entries.raffle_item_id AND e.organizer_id = auth.uid())
);
CREATE POLICY "Checked-in users can enter raffles" ON public.raffle_entries FOR INSERT WITH CHECK (
  auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM order_items oi
    JOIN raffle_items ri ON ri.event_id = oi.event_id
    WHERE ri.id = raffle_entries.raffle_item_id AND oi.user_id = auth.uid() AND oi.checked_in = true
  )
);

-- raffle_draws policies
CREATE POLICY "Anyone can view raffle draws" ON public.raffle_draws FOR SELECT USING (true);
CREATE POLICY "Organizers can manage raffle draws" ON public.raffle_draws FOR ALL USING (
  EXISTS (SELECT 1 FROM raffle_items ri JOIN events e ON e.id = ri.event_id WHERE ri.id = raffle_draws.raffle_item_id AND e.organizer_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM raffle_items ri JOIN events e ON e.id = ri.event_id WHERE ri.id = raffle_draws.raffle_item_id AND e.organizer_id = auth.uid())
);

-- Updated_at triggers
CREATE TRIGGER update_raffle_items_updated_at BEFORE UPDATE ON public.raffle_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_raffle_draws_updated_at BEFORE UPDATE ON public.raffle_draws FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
