-- Wave 3 / F5: listing statistics (views / responses) for sorting + analytics.

CREATE TABLE IF NOT EXISTS public.listing_stats (
  listing_id uuid PRIMARY KEY REFERENCES public.listings (id) ON DELETE CASCADE,
  views int NOT NULL DEFAULT 0,
  responses int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.listing_stats ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.listing_stats FROM anon, authenticated;
GRANT SELECT ON TABLE public.listing_stats TO authenticated;

DROP POLICY IF EXISTS "Stats readable by all authed" ON public.listing_stats;
CREATE POLICY "Stats readable by all authed"
  ON public.listing_stats FOR SELECT
  TO authenticated
  USING (true);

-- Ensure a stats row exists when a listing is created.
CREATE OR REPLACE FUNCTION public.ensure_listing_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.listing_stats (listing_id)
  VALUES (NEW.id)
  ON CONFLICT (listing_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_listing_stats ON public.listings;
CREATE TRIGGER trg_ensure_listing_stats
  AFTER INSERT ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_listing_stats();

CREATE OR REPLACE FUNCTION public.record_listing_view(p_listing_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.listing_stats (listing_id, views)
  VALUES (p_listing_id, 1)
  ON CONFLICT (listing_id) DO UPDATE
    SET views = public.listing_stats.views + 1,
        updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.record_listing_response(p_listing_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.listing_stats (listing_id, responses)
  VALUES (p_listing_id, 1)
  ON CONFLICT (listing_id) DO UPDATE
    SET responses = public.listing_stats.responses + 1,
        updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.record_listing_view(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_listing_response(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_listing_view(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_listing_response(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.ensure_listing_stats() FROM PUBLIC;
