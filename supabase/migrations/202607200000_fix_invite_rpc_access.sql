-- Fix invite RPC access broken by rls_invoker_hardening (202607190012).
-- The invites table itself stays RLS-locked (using false); these functions
-- expose only a narrow, safe read/update interface to clients.
-- DEFINER is required so the functions can read invites despite the
-- table's `using (false)` RLS policy (INVOKER made them return
-- not_found/false for every code).

create or replace function public.is_invite_valid(p_code text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.invites
    where code = p_code
      and used_by is null
      and (expires_at is null or expires_at > now())
  );
$$;

create or replace function public.invite_status(p_code text)
returns text
language sql
security definer
set search_path = public
as $$
  select case
    when not exists (select 1 from public.invites where code = p_code)
      then 'not_found'
    when (select used_by from public.invites where code = p_code) is not null
      then 'used'
    when (select expires_at from public.invites where code = p_code) is not null
      and (select expires_at from public.invites where code = p_code) <= now()
      then 'expired'
    else 'valid'
  end;
$$;

create or replace function public.claim_invite(p_code text, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  with updated as (
    update public.invites
    set used_by = p_user_id,
        used_at = now()
    where code = p_code
      and used_by is null
      and (expires_at is null or expires_at > now())
    returning 1
  )
  select count(*) > 0 from updated;
$$;

grant execute on function public.is_invite_valid(text) to anon, authenticated;
grant execute on function public.invite_status(text) to anon, authenticated;
grant execute on function public.claim_invite(text, uuid) to authenticated;
