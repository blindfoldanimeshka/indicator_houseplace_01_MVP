-- Wave 4 / F9: quick-reply message templates (landlord efficiency, pain #5).

CREATE TABLE IF NOT EXISTS public.message_templates (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 60),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_templates_user ON public.message_templates (user_id);

ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.message_templates FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.message_templates TO authenticated;

DROP POLICY IF EXISTS "Templates owned by user" ON public.message_templates;
CREATE POLICY "Templates owned by user"
  ON public.message_templates FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
