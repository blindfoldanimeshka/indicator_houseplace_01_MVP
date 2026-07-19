-- Phase 9: RLS hardening follow-up.
-- Снимаем SECURITY DEFINER с публично-исполняемых функций, чтобы они
-- выполнялись в контексте вызывающего пользователя (authenticated), а не
-- обходили RLS от имени владельца. anon-доступ убираем; authenticated оставляем,
-- т.к. фронтенд вызывает эти функции из браузера.
-- Идемпотентно: CREATE OR REPLACE + REVOKE/GRANT.

-- 1. is_invite_valid: DEFINER -> INVOKER, убрать anon.
create or replace function public.is_invite_valid(p_code text)
returns boolean
language sql
security invoker
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

revoke execute on function public.is_invite_valid(text) from anon, public;
grant execute on function public.is_invite_valid(text) to authenticated;

-- 2. invite_status: DEFINER -> INVOKER, убрать anon.
create or replace function public.invite_status(p_code text)
returns text
language sql
security invoker
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

revoke execute on function public.invite_status(text) from anon, public;
grant execute on function public.invite_status(text) to authenticated;

-- 3. listing_cover_path: DEFINER -> INVOKER, убрать anon.
--    Функция читает listing_images, на которой уже включена RLS, поэтому
--    INVOKER-контекст корректно ограничивает видимость обложек.
create or replace function public.listing_cover_path(p_listing_id uuid)
returns text
language sql
security invoker
set search_path = public
as $$
  select path
  from public.listing_images
  where listing_id = p_listing_id
  order by sort_order asc, created_at asc
  limit 1;
$$;

revoke execute on function public.listing_cover_path(uuid) from anon, public;
grant execute on function public.listing_cover_path(uuid) to authenticated;

-- 4. claim_invite: уже REVOKE FROM anon,authenticated + GRANT service_role.
--    Переводим в INVOKER для консистентности (service_role обходит RLS,
--    поведение клиента не меняется — клиент эту функцию не вызывает).
create or replace function public.claim_invite(p_code text, p_user_id uuid)
returns boolean
language sql
security invoker
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

revoke execute on function public.claim_invite(text, uuid) from anon, authenticated, public;
grant execute on function public.claim_invite(text, uuid) to service_role;

-- 5. user_settings: обернуть auth.uid() в (select auth.uid()), чтобы планировщик
--    не кэшировал значение между строками (защита от смешения контекста RLS).
drop policy if exists "Users read own settings" on public.user_settings;
drop policy if exists "Users upsert own settings" on public.user_settings;
drop policy if exists "Users update own settings" on public.user_settings;

create policy "Users read own settings"
  on public.user_settings
  for select
  using ((select auth.uid()) = user_id);

create policy "Users upsert own settings"
  on public.user_settings
  for insert
  with check ((select auth.uid()) = user_id);

create policy "Users update own settings"
  on public.user_settings
  for update
  using ((select auth.uid()) = user_id);

-- 6. moderation_audit: намеренно БЕЗ policy (весь клиентский доступ запрещён
--    через REVOKE ALL FROM anon,authenticated). Менять не требуется.
--    Оставляем как есть — это корректная конфигурация, а не уязвимость.
