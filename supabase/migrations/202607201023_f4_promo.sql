-- Wave 3 / F4: promoted listings (paid visibility boost).
-- Resolves pain #5 (no growth channel for landlords).

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS promoted_until timestamptz;

CREATE OR REPLACE FUNCTION public.boost_listing(p_listing_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_author uuid;
  v_org uuid;
BEGIN
  SELECT author_id, org_id INTO v_author, v_org
  FROM public.listings
  WHERE id = p_listing_id
    AND deleted_at IS NULL;

  IF v_author IS NULL THEN
    RAISE EXCEPTION 'listing not found';
  END IF;

  IF v_author <> (SELECT auth.uid()) AND NOT private.is_member_of(v_org) THEN
    RAISE EXCEPTION 'not authorized to promote this listing';
  END IF;

  UPDATE public.listings
  SET promoted_until = now() + interval '7 days'
  WHERE id = p_listing_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.boost_listing(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.boost_listing(uuid) TO authenticated;
