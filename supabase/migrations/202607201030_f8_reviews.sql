-- Wave 4 / F8: post-deal reviews (trust & quality, pain #1 transparency).
-- A review is created via RPC once a chat is closed, by a participant,
-- for the counterparty. One review per (chat, reviewer) pair.

CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES public.chats (id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  reviewee_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text CHECK (char_length(comment) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chat_id, reviewer_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON public.reviews (reviewee_id);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.reviews FROM anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.reviews TO authenticated;

DROP POLICY IF EXISTS "Reviews readable by participants" ON public.reviews;
CREATE POLICY "Reviews readable by participants"
  ON public.reviews FOR SELECT
  TO authenticated
  USING (
    reviewer_id = (SELECT auth.uid())
    OR reviewee_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.chat_participants p
      WHERE p.chat_id = chat_id
        AND p.user_id = (SELECT auth.uid())
        AND p.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS "Reviews inserted by participants on closed chats" ON public.reviews;
CREATE POLICY "Reviews inserted by participants on closed chats"
  ON public.reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    reviewer_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.chats c
      WHERE c.id = chat_id
        AND c.status = 'closed'
        AND EXISTS (
          SELECT 1 FROM public.chat_participants p
          WHERE p.chat_id = c.id
            AND p.user_id = (SELECT auth.uid())
            AND p.deleted_at IS NULL
        )
    )
  );

CREATE OR REPLACE FUNCTION public.create_review(
  p_chat_id uuid,
  p_reviewee_id uuid,
  p_rating smallint,
  p_comment text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.chats c
    WHERE c.id = p_chat_id
      AND c.status = 'closed'
      AND EXISTS (
        SELECT 1 FROM public.chat_participants p
        WHERE p.chat_id = c.id
          AND p.user_id = v_uid
          AND p.deleted_at IS NULL
      )
  ) THEN
    RAISE EXCEPTION 'not authorized to review this chat';
  END IF;

  INSERT INTO public.reviews (chat_id, reviewer_id, reviewee_id, rating, comment)
  VALUES (p_chat_id, v_uid, p_reviewee_id, p_rating, p_comment)
  RETURNING id INTO v_id;

  -- Keep users.rating approximately fresh (avg of received reviews).
  UPDATE public.users u
  SET rating = (
    SELECT avg(r.rating)::numeric(3,2)
    FROM public.reviews r
    WHERE r.reviewee_id = p_reviewee_id
  )
  WHERE u.id = p_reviewee_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_review(uuid, uuid, smallint, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_review(uuid, uuid, smallint, text) TO authenticated;
