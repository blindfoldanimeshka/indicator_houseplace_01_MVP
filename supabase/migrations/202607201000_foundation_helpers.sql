-- Wave 0: foundation helpers for SaaS layer (organizations, actor resolution).
-- Idempotent: CREATE SCHEMA IF NOT EXISTS / CREATE OR REPLACE FUNCTION.
-- check_function_bodies=off lets is_member_of reference organization_members
-- (created later in f1_organizations) without a creation-time relation error.

SET check_function_bodies = off;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;

-- True if the current user is a non-removed member of the given organization.
CREATE OR REPLACE FUNCTION private.is_member_of(p_org uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members AS m
    WHERE m.org_id = p_org
      AND m.user_id = (SELECT auth.uid())
      AND m.deleted_at IS NULL
  );
$$;

-- Effective actor for the current session (placeholder: resolves to the user).
-- Real org-scoped actor resolution lands in the organizations migration.
CREATE OR REPLACE FUNCTION private.actor_entity()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (SELECT auth.uid());
$$;

REVOKE ALL ON FUNCTION private.is_member_of(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.actor_entity() FROM PUBLIC;
