-- Wave: BLOCKED / F6 (Notifications) — SCHEMA ONLY.
-- SMTP / push provider and credentials are a user decision
-- (see docs/out-of-code/). Table + RLS laid out; NO sending logic implemented.

CREATE TABLE IF NOT EXISTS public.notification_prefs (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email_notif boolean NOT NULL DEFAULT true,
  push_notif boolean NOT NULL DEFAULT false,
  inapp_notif boolean NOT NULL DEFAULT true,
  show_profile boolean NOT NULL DEFAULT true,
  show_email boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  type text NOT NULL,
  payload jsonb,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications (user_id, read);

ALTER TABLE public.notification_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.notification_prefs FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.notification_prefs TO authenticated;
REVOKE ALL ON TABLE public.notifications FROM anon, authenticated;
GRANT SELECT, UPDATE ON TABLE public.notifications TO authenticated;

DROP POLICY IF EXISTS "Prefs owned by user" ON public.notification_prefs;
CREATE POLICY "Prefs owned by user"
  ON public.notification_prefs FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Notifications owned by user" ON public.notifications;
CREATE POLICY "Notifications owned by user"
  ON public.notifications FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);
