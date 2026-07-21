-- Wave: F6 (Notifications) — in-app generation via triggers.
-- Generates rows in public.notifications on real events. The actual
-- delivery (Telegram / email) is handled by the notify Edge Function,
-- which reads these rows + the user's prefs. No external provider needed
-- for in-app; Telegram/email are dispatched by functions/notify.

-- Helper: resolve the "other" participant of a chat (the recipient of a
-- notification), excluding the actor who triggered the event.
create or replace function private.other_chat_participant(
  p_chat_id uuid,
  p_actor_id uuid
)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select cp.user_id
  from public.chat_participants cp
  where cp.chat_id = p_chat_id
    and cp.user_id <> p_actor_id
  limit 1;
$$;

-- Notify the other participant when a new message arrives.
create or replace function public.notify_on_new_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_recipient uuid;
  v_listing_id uuid;
begin
  select c.listing_id into v_listing_id
  from public.chats c
  where c.id = new.chat_id;

  v_recipient := private.other_chat_participant(new.chat_id, new.sender_id);

  if v_recipient is not null then
    insert into public.notifications (user_id, type, payload)
    values (
      v_recipient,
      'new_message',
      jsonb_build_object(
        'chat_id', new.chat_id,
        'listing_id', v_listing_id,
        'sender_id', new.sender_id,
        'message_id', new.id,
        'preview', left(new.text, 120)
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_on_new_message on public.messages;
create trigger trg_notify_on_new_message
  after insert on public.messages
  for each row execute function public.notify_on_new_message();

-- Notify the listing author when a new chat is opened on their listing.
-- open_or_create_chat RPC inserts both the chat and its participants.
create or replace function public.notify_on_new_chat()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_author_id uuid;
  v_other uuid;
begin
  select l.author_id into v_author_id
  from public.listings l
  where l.id = new.listing_id;

  select cp.user_id into v_other
  from public.chat_participants cp
  where cp.chat_id = new.id
    and cp.user_id <> v_author_id
  limit 1;

  if v_author_id is not null and v_other is not null and v_author_id <> v_other then
    insert into public.notifications (user_id, type, payload)
    values (
      v_author_id,
      'new_chat',
      jsonb_build_object(
        'chat_id', new.id,
        'listing_id', new.listing_id,
        'from_user_id', v_other
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_on_new_chat on public.chats;
create trigger trg_notify_on_new_chat
  after insert on public.chats
  for each row execute function public.notify_on_new_chat();

-- Notify the chat participants when a deal is closed (chat.status -> 'closed').
create or replace function public.notify_on_deal_closed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'closed' and (old.status is distinct from 'closed') then
    insert into public.notifications (user_id, type, payload)
    select cp.user_id,
           'deal_closed',
           jsonb_build_object('chat_id', new.id, 'listing_id', new.listing_id)
    from public.chat_participants cp
    where cp.chat_id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_on_deal_closed on public.chats;
create trigger trg_notify_on_deal_closed
  after update on public.chats
  for each row execute function public.notify_on_deal_closed();
