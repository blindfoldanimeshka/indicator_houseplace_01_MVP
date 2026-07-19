-- Кастомная привязка Telegram (не нативный OAuth-провайдер Supabase).
-- telegram_id пишется из Edge Function connect-telegram после валидации
-- подписи Telegram Login Widget.

alter table public.users
  add column if not exists telegram_id text unique;
