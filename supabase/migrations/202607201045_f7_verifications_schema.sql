-- Wave: BLOCKED / F7 (Verifications) — SCHEMA ONLY.
-- KYC provider (Sum&Sub / ID.x / etc.) and legal framing are user decisions
-- (see docs/out-of-code/). Table + RLS laid out; NO verification flows yet.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_status') THEN
    CREATE TYPE public.verification_status AS ENUM ('pending', 'verified', 'rejected');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.verifications (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('identity', 'phone', 'email')),
  status public.verification_status NOT NULL DEFAULT 'pending',
  provider text,
  provider_ref text,
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_verifications_user ON public.verifications (user_id);

ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.verifications FROM anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.verifications TO authenticated;

DROP POLICY IF EXISTS "Verifications owned by user" ON public.verifications;
CREATE POLICY "Verifications owned by user"
  ON public.verifications FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
