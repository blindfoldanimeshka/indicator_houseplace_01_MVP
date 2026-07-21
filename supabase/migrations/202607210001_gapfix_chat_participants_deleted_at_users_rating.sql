-- Gap-fix migration (Wave A): columns referenced by later F-series migrations
-- but missing from the live DB. Idempotent. No data loss.
--  - chat_participants.deleted_at: required by f11_chat_status UPDATE policy
--    and f8_reviews policies.
--  - users.rating: required by f8_reviews create_review (UPDATE users SET rating).

ALTER TABLE public.chat_participants
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS rating numeric(3, 2);
