-- Хранение пользовательских настроек профиля.
-- Поля как отдельные колонки (не jsonb) для простой RLS и читаемости.

create table if not exists public.user_settings (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  email_notif    boolean not null default true,
  push_notif     boolean not null default true,
  inapp_notif    boolean not null default true,
  show_profile   boolean not null default true,
  show_email     boolean not null default false,
  theme          text    not null default 'system'
                  check (theme in ('light', 'dark', 'system')),
  language       text    not null default 'ru'
                  check (language in ('ru', 'en')),
  updated_at     timestamptz default now()
);

alter table public.user_settings enable row level security;

-- Пользователь видит только свои настройки.
create policy "Users read own settings"
  on public.user_settings
  for select
  using (auth.uid() = user_id);

-- Пользователь пишет только свои настройки.
create policy "Users upsert own settings"
  on public.user_settings
  for insert
  with check (auth.uid() = user_id);

create policy "Users update own settings"
  on public.user_settings
  for update
  using (auth.uid() = user_id);
