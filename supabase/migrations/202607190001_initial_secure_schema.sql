-- Initial secure schema for «напрямую» MVP.
-- Applied first to Supabase project MVP-House on 2026-07-19.

-- Keep the existing DDL event trigger, but make its implementation impossible
-- to invoke through the public Data API.
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;

CREATE TYPE public.listing_type AS ENUM ('offer', 'request');
CREATE TYPE public.listing_status AS ENUM ('active', 'archived', 'rejected');
CREATE TYPE public.report_target_type AS ENUM ('listing', 'chat', 'message');
CREATE TYPE public.report_status AS ENUM ('new', 'reviewed', 'resolved');

CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name varchar(100) NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 100),
  city varchar(100),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.listings (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type public.listing_type NOT NULL,
  city varchar(100) NOT NULL CHECK (char_length(btrim(city)) BETWEEN 2 AND 100),
  rooms varchar(20) NOT NULL CHECK (rooms IN ('studio', '1', '2', '3', '4+')),
  price integer NOT NULL CHECK (price BETWEEN 1 AND 10000000),
  area integer CHECK (area BETWEEN 1 AND 10000),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 2000),
  status public.listing_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE public.chats (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  initiator_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chats_listing_initiator_key UNIQUE (listing_id, initiator_id)
);

CREATE TABLE public.chat_participants (
  chat_id uuid NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (chat_id, user_id)
);

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  text text NOT NULL CHECK (char_length(btrim(text)) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  target_type public.report_target_type NOT NULL,
  target_id uuid NOT NULL,
  category varchar(50) NOT NULL CHECK (char_length(btrim(category)) BETWEEN 1 AND 50),
  comment text NOT NULL DEFAULT '' CHECK (char_length(comment) <= 1000),
  status public.report_status NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE INDEX listings_active_feed_idx
  ON public.listings (created_at DESC)
  WHERE status = 'active' AND deleted_at IS NULL;
CREATE INDEX listings_city_idx ON public.listings (city);
CREATE INDEX listings_author_id_idx ON public.listings (author_id);
CREATE INDEX chats_initiator_id_idx ON public.chats (initiator_id);
CREATE INDEX chat_participants_user_id_idx ON public.chat_participants (user_id);
CREATE INDEX messages_chat_created_idx ON public.messages (chat_id, created_at);
CREATE INDEX reports_reporter_id_idx ON public.reports (reporter_id);
CREATE UNIQUE INDEX reports_one_open_report_per_target_idx
  ON public.reports (reporter_id, target_type, target_id)
  WHERE status IN ('new', 'reviewed');

CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.users (id, name, city)
  VALUES (
    NEW.id,
    left(COALESCE(NULLIF(btrim(NEW.raw_user_meta_data ->> 'name'), ''), 'Пользователь'), 100),
    NULLIF(left(btrim(NEW.raw_user_meta_data ->> 'city'), 100), '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.handle_new_user();

CREATE OR REPLACE FUNCTION private.prepare_listing_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF (SELECT auth.uid()) IS NOT NULL THEN
    IF NEW.author_id IS DISTINCT FROM OLD.author_id
      OR NEW.status IS DISTINCT FROM OLD.status
      OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'author_id, status and created_at cannot be changed by a user';
    END IF;

    IF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
      RAISE EXCEPTION 'an archived listing cannot be restored by a user';
    END IF;

    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      NEW.deleted_at := now();
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER listings_prepare_update
  BEFORE UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION private.prepare_listing_update();

CREATE OR REPLACE FUNCTION private.is_chat_participant(p_chat_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_participants AS participant
    WHERE participant.chat_id = p_chat_id
      AND participant.user_id = (SELECT auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.open_or_create_chat(p_listing_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id uuid := (SELECT auth.uid());
  listing_author_id uuid;
  result_chat_id uuid;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication is required' USING ERRCODE = '28000';
  END IF;

  SELECT listing.author_id
  INTO listing_author_id
  FROM public.listings AS listing
  WHERE listing.id = p_listing_id
    AND listing.status = 'active'
    AND listing.deleted_at IS NULL;

  IF listing_author_id IS NULL THEN
    RAISE EXCEPTION 'listing is not available' USING ERRCODE = 'P0002';
  END IF;

  IF listing_author_id = current_user_id THEN
    RAISE EXCEPTION 'cannot create a chat with yourself' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.chats (listing_id, initiator_id)
  VALUES (p_listing_id, current_user_id)
  ON CONFLICT (listing_id, initiator_id) DO NOTHING
  RETURNING id INTO result_chat_id;

  IF result_chat_id IS NULL THEN
    SELECT chat.id
    INTO result_chat_id
    FROM public.chats AS chat
    WHERE chat.listing_id = p_listing_id
      AND chat.initiator_id = current_user_id;
  ELSE
    INSERT INTO public.chat_participants (chat_id, user_id)
    VALUES
      (result_chat_id, listing_author_id),
      (result_chat_id, current_user_id);
  END IF;

  RETURN result_chat_id;
END;
$$;

REVOKE ALL ON FUNCTION private.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.prepare_listing_update() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_chat_participant(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.open_or_create_chat(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.open_or_create_chat(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_chat_participant(uuid) TO authenticated;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.users, public.listings, public.chats,
  public.chat_participants, public.messages, public.reports
  FROM anon, authenticated;

GRANT SELECT ON public.users, public.listings TO anon, authenticated;
GRANT UPDATE ON public.users TO authenticated;
GRANT INSERT, UPDATE ON public.listings TO authenticated;
GRANT SELECT ON public.chats, public.chat_participants TO authenticated;
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT SELECT, INSERT ON public.reports TO authenticated;

CREATE POLICY "Public profiles are readable"
  ON public.users FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Users update only their own profile"
  ON public.users FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "Public sees active listings"
  ON public.listings FOR SELECT
  TO anon, authenticated
  USING (status = 'active' AND deleted_at IS NULL);

CREATE POLICY "Authors see their own listings"
  ON public.listings FOR SELECT
  TO authenticated
  USING (author_id = (SELECT auth.uid()));

CREATE POLICY "Users create their own active listings"
  ON public.listings FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = (SELECT auth.uid())
    AND status = 'active'
  );

CREATE POLICY "Authors update their own listings"
  ON public.listings FOR UPDATE
  TO authenticated
  USING (author_id = (SELECT auth.uid()))
  WITH CHECK (author_id = (SELECT auth.uid()));

CREATE POLICY "Participants read chats"
  ON public.chats FOR SELECT
  TO authenticated
  USING ((SELECT private.is_chat_participant(id)));

CREATE POLICY "Participants read chat membership"
  ON public.chat_participants FOR SELECT
  TO authenticated
  USING ((SELECT private.is_chat_participant(chat_id)));

CREATE POLICY "Participants read messages"
  ON public.messages FOR SELECT
  TO authenticated
  USING ((SELECT private.is_chat_participant(chat_id)));

CREATE POLICY "Participants send their own messages"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = (SELECT auth.uid())
    AND (SELECT private.is_chat_participant(chat_id))
  );

CREATE POLICY "Users read their own reports"
  ON public.reports FOR SELECT
  TO authenticated
  USING (reporter_id = (SELECT auth.uid()));

CREATE POLICY "Users create their own reports"
  ON public.reports FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = (SELECT auth.uid()) AND status = 'new');

