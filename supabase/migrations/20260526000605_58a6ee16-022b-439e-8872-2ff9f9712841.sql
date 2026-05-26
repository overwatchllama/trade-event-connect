
CREATE TABLE public.bulk_edit_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  entries jsonb NOT NULL,
  summary jsonb,
  undone_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_bulk_edit_audit_user_created ON public.bulk_edit_audit_log (user_id, created_at DESC);

ALTER TABLE public.bulk_edit_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own audit log"
  ON public.bulk_edit_audit_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert their own audit log"
  ON public.bulk_edit_audit_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update their own audit log"
  ON public.bulk_edit_audit_log FOR UPDATE
  USING (auth.uid() = user_id);
