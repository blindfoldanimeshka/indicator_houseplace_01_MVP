-- Аватар пользователя: бакет avatars + поле users.avatar_path.
-- Один файл на пользователя: avatars/{user_id}. Перезаписывается при смене.

-- 1. Поле для хранения пути к аватару.
alter table public.users
  add column if not exists avatar_path text;

-- 2. Бакет (public read; writes controlled by RLS).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 3. Хелпер: user_id из пути avatars/{user_id}
create or replace function private.user_id_from_avatar_path(p_path text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select (string_to_array(p_path, '/'))[2]::uuid
$$;

-- 4. Storage RLS: пользователь работает только со своим объектом.
create policy "Users read own avatar"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'avatars'
    and (select private.user_id_from_avatar_path(name)) = auth.uid()
  );

create policy "Users upload own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (select private.user_id_from_avatar_path(name)) = auth.uid()
  );

create policy "Users delete own avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (select private.user_id_from_avatar_path(name)) = auth.uid()
  );
