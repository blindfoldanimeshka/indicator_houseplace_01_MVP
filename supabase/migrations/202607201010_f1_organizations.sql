-- Wave 2 / F1: Organizations (agencies, landlords, B2B seeding).
-- Matches docs/backend-analysis.md guardrails: org membership isolated, members MF.

CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 100),
  owner_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.organization_members (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  invited_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (org_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.organization_members (user_id);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.organizations FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.organizations TO authenticated;
REVOKE ALL ON TABLE public.organization_members FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.organization_members TO authenticated;

-- Organizations: owner has full access; members can read; nobody else sees them.
DROP POLICY IF EXISTS "Org owner full access" ON public.organizations;
CREATE POLICY "Org owner full access"
  ON public.organizations FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = owner_id)
  WITH CHECK ((SELECT auth.uid()) = owner_id);

DROP POLICY IF EXISTS "Org readable by members" ON public.organizations;
CREATE POLICY "Org readable by members"
  ON public.organizations FOR SELECT
  TO authenticated
  USING (private.is_member_of(id));

-- Owner/admin only may manage members (S3 hardening): plain members cannot.
CREATE OR REPLACE FUNCTION private.is_org_admin_of(p_org uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members m
    WHERE m.org_id = p_org
      AND m.user_id = (SELECT auth.uid())
      AND m.role IN ('owner', 'admin')
      AND m.deleted_at IS NULL
  );
$$;

DROP POLICY IF EXISTS "Members manageable by owner/admin" ON public.organization_members;
CREATE POLICY "Members manageable by owner/admin"
  ON public.organization_members FOR ALL
  TO authenticated
  USING (private.is_org_admin_of(org_id))
  WITH CHECK (private.is_org_admin_of(org_id));

DROP POLICY IF EXISTS "Members self-read" ON public.organization_members;
CREATE POLICY "Members self-read"
  ON public.organization_members FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id OR private.is_member_of(org_id));

-- create_organization: inserts org + owner membership atomically.
CREATE OR REPLACE FUNCTION public.create_organization(p_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_org uuid;
  v_uid uuid := (SELECT auth.uid());
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  INSERT INTO public.organizations (name, owner_id)
  VALUES (p_name, v_uid)
  RETURNING id INTO v_org;
  INSERT INTO public.organization_members (org_id, user_id, role)
  VALUES (v_org, v_uid, 'owner');
  RETURN v_org;
END;
$$;

-- add_org_member: owner/admin invites an existing user by email.
CREATE OR REPLACE FUNCTION public.add_org_member(p_org uuid, p_user_email text, p_role text DEFAULT 'member')
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid;
BEGIN
  IF NOT private.is_member_of(p_org) THEN
    RAISE EXCEPTION 'not a member of this organization';
  END IF;
  SELECT id INTO v_uid FROM auth.users WHERE email = p_user_email;
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'user with email not found';
  END IF;
  INSERT INTO public.organization_members (org_id, user_id, role, invited_by)
  VALUES (p_org, v_uid, p_role, (SELECT auth.uid()))
  ON CONFLICT (org_id, user_id) DO NOTHING;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.create_organization(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.add_org_member(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_organization(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_org_member(uuid, text, text) TO authenticated;

-- Ensure RLS helper functions are callable by authenticated
-- (foundation_helpers revoked EXECUTE from PUBLIC).
GRANT EXECUTE ON FUNCTION private.is_member_of(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_org_admin_of(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.actor_entity() TO authenticated;
