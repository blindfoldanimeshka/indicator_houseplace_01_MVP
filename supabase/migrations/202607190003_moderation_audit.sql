-- Phase 7: moderation audit log (service-role only, no client access).
CREATE TABLE IF NOT EXISTS public.moderation_audit (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  moderator_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (char_length(btrim(action)) BETWEEN 1 AND 100),
  target_type public.report_target_type NOT NULL,
  target_id uuid NOT NULL,
  note text NOT NULL DEFAULT '' CHECK (char_length(note) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX moderation_audit_target_idx ON public.moderation_audit (target_type, target_id);

-- No client (anon/authenticated) access: moderation is performed via the
-- service role in a closed SQL console, per roadmap §4.5 MVP.
ALTER TABLE public.moderation_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.moderation_audit FROM anon, authenticated;
REVOKE ALL ON TABLE public.moderation_audit FROM PUBLIC;
-- service_role keeps ALL by default; no GRANT to authenticated/anon.
