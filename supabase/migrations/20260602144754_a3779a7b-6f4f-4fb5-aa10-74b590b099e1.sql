CREATE TABLE public.stock_adjustments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  item_id uuid NOT NULL,
  previous_quantity integer NOT NULL,
  counted_quantity integer NOT NULL,
  delta integer NOT NULL,
  reason text,
  notes text,
  source text,
  event_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.stock_adjustments TO authenticated;
GRANT ALL ON public.stock_adjustments TO service_role;

ALTER TABLE public.stock_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own stock adjustments"
  ON public.stock_adjustments
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert their own stock adjustments"
  ON public.stock_adjustments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_stock_adjustments_user_created ON public.stock_adjustments (user_id, created_at DESC);
CREATE INDEX idx_stock_adjustments_item ON public.stock_adjustments (item_id, created_at DESC);