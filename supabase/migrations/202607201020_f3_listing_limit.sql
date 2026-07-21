-- Wave 3 / F3: listing publish limit (5 active listings / author / month).
-- Resolves pain #3 (spam, no quality control). Free tier enforced in DB
-- via a BEFORE INSERT trigger so it cannot be bypassed from the client.

CREATE OR REPLACE FUNCTION private.count_active_listings_this_month(p_author uuid)
RETURNS int
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT count(*)::int
  FROM public.listings l
  WHERE l.author_id = p_author
    AND l.status = 'active'
    AND l.deleted_at IS NULL
    AND l.created_at >= date_trunc('month', now())
$$;

CREATE OR REPLACE FUNCTION public.enforce_listing_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.status = 'active' AND NEW.deleted_at IS NULL THEN
    IF private.count_active_listings_this_month(NEW.author_id) >= 5 THEN
      RAISE EXCEPTION 'listing_limit_exceeded: max 5 active listings per month'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_listing_limit ON public.listings;
CREATE TRIGGER trg_enforce_listing_limit
  BEFORE INSERT ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_listing_limit();

REVOKE ALL ON FUNCTION public.enforce_listing_limit() FROM PUBLIC;
