-- Wave: BLOCKED / F2 (Billing) — SCHEMA ONLY.
-- Provider (YooKassa vs Stripe) and 152-FZ compliance are user decisions
-- (see docs/out-of-code/). We lay the table now so the schema is migration-ready,
-- but NO billing logic, webhooks, or payment flows are implemented yet.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plan_interval') THEN
    CREATE TYPE public.plan_interval AS ENUM ('monthly', 'yearly');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.plans (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  price_rub integer NOT NULL CHECK (price_rub >= 0),
  interval public.plan_interval NOT NULL DEFAULT 'monthly',
  limits jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.plans (id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due')),
  provider text,
  provider_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions (user_id);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.plans FROM anon, authenticated;
GRANT SELECT ON TABLE public.plans TO authenticated;
REVOKE ALL ON TABLE public.subscriptions FROM anon, authenticated;
-- S2 hardening: no direct INSERT/UPDATE from the client. Subscriptions are
-- created/updated only via service_role or a future billing RPC.
GRANT SELECT ON TABLE public.subscriptions TO authenticated;

DROP POLICY IF EXISTS "Plans readable by all authed" ON public.plans;
CREATE POLICY "Plans readable by all authed"
  ON public.plans FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Subscriptions owned by user" ON public.subscriptions;
CREATE POLICY "Subscriptions owned by user"
  ON public.subscriptions FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
