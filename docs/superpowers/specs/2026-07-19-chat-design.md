# Design: Phase 6 — Chat between users (MVP «напрямую»)

- Date: 2026-07-19
- Status: approved (autonomous mode per user instruction)
- Roadmap ref: technical-specification-roadmap.md §4.4, §7 Phase 6
- Depends on: Phase 3 (auth), DB RPC `open_or_create_chat` (applied in initial migration)

## Goal

Let a user start a conversation from a listing and exchange messages with the
listing author. Chat creation is the atomic RPC `open_or_create_chat(listing_id)`
already in the DB (direct INSERT into chats/chat_participants is blocked by RLS).
Real-time delivery via Supabase Realtime with a polling fallback.

## Scope (YAGNI)

- No editing/deleting messages (per §4.4).
- One chat per (listing + initiator) — enforced by RPC unique key.
- No group chats (≤2 participants enforced by schema/RLS).
- No chat from archived/deleted/inactive listings (enforced by RPC).

## Success criteria

1. From a listing detail, an authenticated non-author can click "Написать" →
   calls `open_or_create_chat(listing_id)` → navigates to the thread.
2. Author cannot open chat with their own listing (RPC raises; UI blocks).
3. Both participants see messages; new messages appear in real time.
4. Message send: `sender_id = current user`, must be a participant (RLS).
   UI has sending / sent / error-with-retry states; idempotent-ish.
5. A "My chats" list shows the user's conversations (listing + other party).
6. A third user cannot discover or read the chat.

## Architecture

- `src/features/chat/chatApi.ts`:
  - `openOrCreateChat(listingId)` → `supabase.rpc('open_or_create_chat', { p_listing_id: listingId })`.
  - `listMyChats()` → select from `chats` joined to listing + other participant; simpler: `supabase.from('chats').select('id, listing_id, created_at').eq participant` — but chats RLS only allows SELECT where participant. Use `supabase.from('chats').select('*')` (RLS filters to participant's chats) then for each fetch listing + other participant.
  - `listMessages(chatId)` → `from('messages').select('*').eq('chat_id', chatId).order('created_at')`.
  - `sendMessage(chatId, text)` → `from('messages').insert({ chat_id, sender_id: user.id, text })`.
  - `subscribeMessages(chatId, onInsert)` → `supabase.channel(...).on('postgres_changes', { event:'INSERT', schema:'public', table:'messages', filter:`chat_id=eq.${chatId}` }, cb).subscribe()`; returns the channel for cleanup. Fallback: poll `listMessages` every N seconds if subscribe fails (catch).
- `src/features/chat/ChatList.tsx` — "My chats" list.
- `src/features/chat/Thread.tsx` — message list + composer with states.
- `src/features/chat/chatSchema.ts` — Zod: text 1..2000.
- Wire into App: view-state `chats` (list) and `thread` (chatId), plus a
  "Написать" button on ListingDetail that calls openOrCreateChat then goes to thread.
- `src/types/database.ts` — add `chats`, `chat_participants`, `messages` table types.

## Data flow

1. ListingDetail "Написать" → `openOrCreateChat(listing.id)` → get chatId →
   setView('thread', chatId).
2. Thread mounts → `listMessages` + `subscribeMessages` (real-time). Compose →
   `sendMessage`. On realtime INSERT, append. On error, retry button.
3. ChatList → `listMyChats` (RLS returns only participant chats).

## Validation

Zod message text 1..2000 (trim). RLS enforces sender is participant.

## Error handling

Send: sending/sent/error states; retry on failure. Realtime: try subscribe,
on failure fall back to polling with backoff; show subtle "обновление…".

## Testing (qa-engineer)

- Unit `chatApi.ts` (mocked supabase): openOrCreateChat calls rpc; sendMessage
  sets sender_id; listMessages filters chat_id; subscribeMessages subscribes
  with correct filter and calls callback on INSERT; fallback polls on error.
- Component: Thread renders messages, composer validation, send states;
  ChatList renders user's chats.
- Keep all existing tests green; target ≥8 new tests.

## Rollout

frontend-dev builds api + components + wiring; qa-engineer adds tests; run
lint/typecheck/test; commit. Push on user request.
