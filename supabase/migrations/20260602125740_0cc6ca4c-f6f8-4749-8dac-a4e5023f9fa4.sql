CREATE TABLE public.label_print_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL DEFAULT 'print',
  source text,
  preset text,
  copies_per_item integer NOT NULL DEFAULT 1,
  per_quantity boolean NOT NULL DEFAULT true,
  item_ids uuid[] NOT NULL DEFAULT '{}',
  item_count integer NOT NULL DEFAULT 0,
  label_count integer NOT NULL DEFAULT 0,
  reprint_count integer NOT NULL DEFAULT 0,
  filter_context jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.label_print_audit TO authenticated;
GRANT ALL ON public.label_print_audit TO service_role;

ALTER TABLE public.label_print_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own label print audit"
  ON public.label_print_audit FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert their own label print audit"
  ON public.label_print_audit FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX label_print_audit_user_created_idx
  ON public.label_print_audit (user_id, created_at DESC);