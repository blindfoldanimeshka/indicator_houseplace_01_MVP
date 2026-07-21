-- Wave 4 / F10: message attachments (photos/docs in chat, pain #5 richer comms).

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS attachment_path text,
  ADD COLUMN IF NOT EXISTS attachment_type text
    CHECK (attachment_type IS NULL OR attachment_type IN ('image', 'document'));

-- Validate that an attachment has both path and a valid type.
ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS chk_message_attachment;
ALTER TABLE public.messages
  ADD CONSTRAINT chk_message_attachment
    CHECK (
      (attachment_path IS NULL AND attachment_type IS NULL)
      OR (attachment_path IS NOT NULL AND attachment_type IS NOT NULL)
    );

-- Store attachments in the existing message-attachments bucket (created in prior migrations).
-- RLS on messages already restricts reads to chat participants; attachments
-- inherit that isolation via the messages row.
