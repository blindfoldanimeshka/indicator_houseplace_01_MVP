-- Фаза 8: инвайт-коды для закрытой беты.
-- Таблица invites + SECURITY DEFINER функция проверки без прямого чтения таблицы.

create table if not exists public.invites (
  code         text primary key,
  created_by   uuid references auth.users (id),
  used_by      uuid references auth.users (id),
  used_at      timestamptz,
  note         text,
  created_at   timestamptz default now(),
  expires_at   timestamptz default (now() + interval '30 days')
);

create index if not exists idx_invites_used
  on public.invites (used_by)
  where used_by is not null;

alter table public.invites enable row level security;

-- Прямое чтение/запись таблицы запрещена для всех ролей клиента.
-- Коды выдаются вручную оператором через SQL-консоль (service_role).
create policy "no client access to invites"
  on public.invites
  for all
  using (false)
  with check (false);

-- Аноним/авторизованный проверяет ТОЛЬКО факт существования
-- свободного, непросроченного кода. Данные таблицы не раскрываются.
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

grant execute on function public.is_invite_valid(text) to anon, authenticated;

-- Пометить инвайт использованным (вызывается только из Edge Function
-- с service_role при атомарной регистрации, либо вручную оператором).
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

revoke execute on function public.claim_invite(text, uuid) from anon, authenticated;
grant execute on function public.claim_invite(text, uuid) to service_role;
