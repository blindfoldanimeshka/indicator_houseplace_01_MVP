-- Phase 7: security hardening (post-review).
-- Applied to Supabase project MVP-House on 2026-07-19.
-- Safe to re-run: CREATE OR REPLACE / IF NOT EXISTS / DO blocks only.

-- 1. Enforce MAX 10 photos per listing at the DB level.
--    The client used MAX_PHOTOS=10, but the limit was not enforced server-side.
CREATE OR REPLACE FUNCTION private.enforce_listing_image_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF (
    SELECT count(*)
    FROM public.listing_images
    WHERE listing_id = NEW.listing_id
  ) >= 10 THEN
    RAISE EXCEPTION 'a listing may have at most 10 photos'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.enforce_listing_image_limit() FROM PUBLIC;

DROP TRIGGER IF EXISTS listing_images_limit ON public.listing_images;
CREATE TRIGGER listing_images_limit
  BEFORE INSERT ON public.listing_images
  FOR EACH ROW EXECUTE FUNCTION private.enforce_listing_image_limit();

-- 2. Harden private.listing_id_from_path: reject malformed storage paths.
--    A non-matching path yields NULL, so is_listing_author(NULL) is false and
--    Storage RLS denies access (defence in depth against path injection).
CREATE OR REPLACE FUNCTION private.listing_id_from_path(p_path text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_path ~ '^listing/[0-9a-fA-F-]{36}/[0-9a-fA-F-]{36}\.(jpg|png|webp)$'
      THEN (string_to_array(p_path, '/'))[2]::uuid
    ELSE NULL
  END
$$;

-- 3. Enable Realtime RLS on messages and chats so realtime events respect RLS.
--    Only added if the publication exists and the tables are not already members.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'messages'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.messages';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'chats'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.chats';
    END IF;
  END IF;
END $$;
