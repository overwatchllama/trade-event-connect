-- Create orders table for ticket purchases
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  stripe_payment_intent_id TEXT,
  stripe_session_id TEXT,
  promo_code TEXT,
  discount_amount NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create order_items table for individual tickets
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  event_day_id UUID REFERENCES public.event_days(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  ticket_type TEXT NOT NULL DEFAULT 'general',
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  ticket_code TEXT NOT NULL UNIQUE,
  qr_data TEXT NOT NULL,
  checked_in BOOLEAN DEFAULT false,
  checked_in_at TIMESTAMP WITH TIME ZONE,
  checked_in_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Orders policies
CREATE POLICY "Users can view their own orders"
ON public.orders FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own orders"
ON public.orders FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own orders"
ON public.orders FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Event organizers can view orders for their events"
ON public.orders FOR SELECT
USING (EXISTS (
  SELECT 1 FROM events
  WHERE events.id = orders.event_id
  AND events.organizer_id = auth.uid()
));

-- Order items policies
CREATE POLICY "Users can view their own tickets"
ON public.order_items FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tickets"
ON public.order_items FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Event organizers can view tickets for their events"
ON public.order_items FOR SELECT
USING (EXISTS (
  SELECT 1 FROM events
  WHERE events.id = order_items.event_id
  AND events.organizer_id = auth.uid()
));

CREATE POLICY "Event organizers can update tickets for their events"
ON public.order_items FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM events
  WHERE events.id = order_items.event_id
  AND events.organizer_id = auth.uid()
));

-- Create indexes for performance
CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_event_id ON public.orders(event_id);
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX idx_order_items_event_id ON public.order_items(event_id);
CREATE INDEX idx_order_items_ticket_code ON public.order_items(ticket_code);
CREATE INDEX idx_order_items_user_id ON public.order_items(user_id);

-- Trigger for updated_at
CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_order_items_updated_at
BEFORE UPDATE ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();