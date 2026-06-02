ALTER TABLE public.stock_adjustments
  ADD COLUMN IF NOT EXISTS notes_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS notes_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS notes_updated_by uuid;

GRANT UPDATE (notes, notes_history, notes_updated_at, notes_updated_by) ON public.stock_adjustments TO authenticated;

DROP POLICY IF EXISTS "Users update notes on their own stock adjustments" ON public.stock_adjustments;
CREATE POLICY "Users update notes on their own stock adjustments"
  ON public.stock_adjustments
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);