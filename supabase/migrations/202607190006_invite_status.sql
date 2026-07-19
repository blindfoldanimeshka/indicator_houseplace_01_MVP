-- Фаза 8 (дополнение): различать причины отказа инвайт-кода.
-- Возвращает 'valid' | 'used' | 'expired' | 'not_found'.
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

grant execute on function public.invite_status(text) to anon, authenticated;
