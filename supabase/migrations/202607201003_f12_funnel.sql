-- Wave 1 / F12: funnel event analytics sink.
-- Cheap, no external deps; validates user pains 1-5 with real numbers.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'funnel_event_type') THEN
    CREATE TYPE public.funnel_event_type AS ENUM (
      'view_listing', 'open_chat', 'send_message', 'create_listing', 'complete_deal', 'boost_listing'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.funnel_events (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  event_type public.funnel_event_type NOT NULL,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_funnel_event_type_time
  ON public.funnel_events (event_type, created_at);

ALTER TABLE public.funnel_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.funnel_events FROM anon, authenticated;
GRANT INSERT, SELECT ON TABLE public.funnel_events TO authenticated;

DROP POLICY IF EXISTS "Users insert own events" ON public.funnel_events;
CREATE POLICY "Users insert own events"
  ON public.funnel_events FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users read own events" ON public.funnel_events;
CREATE POLICY "Users read own events"
  ON public.funnel_events FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);
