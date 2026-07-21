-- Fix avatar storage RLS helper (Wave A).
-- supabase-js .upload(userId, file) stores the object with name = auth.uid()::text
-- (bucket-relative, NO 'avatars/' prefix). The original helper parsed
-- string_to_array(name, '/')[2], which is NULL for a bare name, so every
-- authenticated upload was denied (HTTP 400). Redefine to read the bare name,
-- and grant EXECUTE to authenticated (it was revoked / never granted).

CREATE OR REPLACE FUNCTION private.user_id_from_avatar_path(p_path text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT NULLIF(p_path, '')::uuid;
$$;

REVOKE ALL ON FUNCTION private.user_id_from_avatar_path(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.user_id_from_avatar_path(text) TO authenticated;
