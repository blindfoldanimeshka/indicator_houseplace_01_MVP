-- Wave 3 / F11: chat lifecycle status (open / closed / archived).
-- Lets users mark a deal as closed so we can measure deal completion (pain #4).

ALTER TABLE public.chats
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'closed', 'archived'));

ALTER TABLE public.chats
  ADD COLUMN IF NOT EXISTS closed_at timestamptz;

DROP POLICY IF EXISTS "Chat participants can update status" ON public.chats;
CREATE POLICY "Chat participants can update status"
  ON public.chats FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_participants p
      WHERE p.chat_id = id
        AND p.user_id = (SELECT auth.uid())
        AND p.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_participants p
      WHERE p.chat_id = id
        AND p.user_id = (SELECT auth.uid())
        AND p.deleted_at IS NULL
    )
  );
