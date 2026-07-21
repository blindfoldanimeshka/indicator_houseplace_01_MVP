# SaaS features — implementation notes

Each feature below is implemented end-to-end (DB migration + RLS + client + UI where
applicable) and covered by unit tests. Migations live in `supabase/migrations/`
with a `2026072010xx_` UTC prefix.

## F1 — Organizations (B2B seed)
- Tables: `organizations`, `organization_members`. RLS: owner full access,
  members can read, members manage via `private.is_member_of`.
- RPCs: `create_organization(p_name)`, `add_org_member(p_org, p_user_email, p_role)`.
- Client: `src/features/organizations/orgApi.ts`. UI: `OrganizationsTab` wired
  into `ProfilePage` tabs. `ListingForm` lets an author publish under an org.

## F3 — Listing publish limit (5 / author / month)
- Trigger `trg_enforce_listing_limit` BEFORE INSERT on `listings`; helper
  `private.count_active_listings_this_month`. Raises `check_violation` past 5.
- Enforced in DB so clients cannot bypass. `createListing` already surfaces the
  error message to the user.

## F4 — Promoted listings
- Column `listings.promoted_until`. RPC `boost_listing(p_listing_id)` sets
  +7 days; authorized for the author or an org member.
- UI: owner sees "Поднять объявление" / "Продлить продвижение" in
  `ListingDetail`. Promoted badge shown.

## F5 — Listing statistics
- Table `listing_stats` (views, responses). `trg_ensure_listing_stats`
  creates a row per new listing. RPCs `record_listing_view`,
  `record_listing_response` (called from Feed open + chat open).
- Feed "Популярные" sort joins `listing_stats` by `views` desc.

## F8 — Post-deal reviews
- Table `reviews` (1 per chat+reviewer). RPC `create_review` requires a
  CLOSED chat and a participant; updates `users.rating` (avg).
- UI: when a chat is `closed`, `Thread` shows a 1–5 star review form for the
  counterparty.

## F9 — Message templates
- Table `message_templates` (owner-only RLS). Client `templatesApi.ts`.
- UI: quick-reply chips in `Thread` composer insert the template body.

## F10 — Chat attachments
- Columns `messages.attachment_path`, `attachment_type` ('image'|'document')
  with a CHECK ensuring both/null. UI shows image preview or doc link; composer
  accepts an attachment URL.

## F11 — Chat lifecycle
- Column `chats.status` ('open'|'closed'|'archived') + `closed_at`. RLS lets
  chat participants update status. `closeChat(chatId)` in `chatApi`.
- UI: `ChatList` shows "Закрыть" for open chats and a "Сделка закрыта" badge.

## F12 — Funnel analytics
- Table `funnel_events` (user_id, event_type enum, payload). Edge Function
  `track-event` validates event_type and stamps the real user_id from the
  session JWT (server-side, cannot be forged). Client `trackEvent()` is
  fire-and-forget and never breaks UX.
- Wired into: create_listing, view_listing (Feed), open_chat, send_message,
  boost_listing.

## F6 — Notifications (in-app + Telegram + email)

Implemented end-to-end. Three delivery channels, driven by real events.

### In-app (no external provider)
- DB triggers generate rows in `public.notifications` on:
  - `trg_notify_on_new_message` (AFTER INSERT on `messages`) — notifies the
    *other* chat participant.
  - `trg_notify_on_new_chat` (AFTER INSERT on `chats`) — notifies the
    listing author.
  - `trg_notify_on_deal_closed` (AFTER UPDATE on `chats` status→closed).
- Helper `private.other_chat_participant` resolves the recipient.
- Client: `useNotifications()` subscribes via Supabase Realtime and shows a
  bell with an unread badge (`NotificationBell.tsx`) wired into `AppShell`.
  Mark-as-read writes `read=true` on `notifications`.

### Telegram (real send)
- `supabase/functions/notify/index.ts` (Deno) reads unread rows +
  `notification_prefs`, and for each enabled channel dispatches:
  - Telegram: `POST https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/sendMessage`
    to the user's `telegram_id` (linked via `connect-telegram` EF).
  - Email: `POST https://api.resend.com/emails` when `RESEND_API_KEY` is set.
- Called from `chatApi.sendMessage`, `openOrCreateChat`, `closeChat` via
  `dispatchNotifications()` (fire-and-forget, never blocks UX).

### Preferences (real, wired)
- `useSettings.save` mirrors `notifications.{email,push,inApp}` into
  `notification_prefs` so the `notify` EF reads the user's actual choice.
- `SettingsTab` "Уведомления" toggles drive the saved prefs.

### Required Supabase secrets (set in project, not in code)
- `TELEGRAM_BOT_TOKEN` — enables Telegram delivery.
- `RESEND_API_KEY` + `RESEND_FROM` — enables email delivery.
- Without these the in-app channel still works (rows are persisted by triggers).

## Blocked (schema only, no fake logic)
- F2 Billing: tables `plans`, `subscriptions` + RLS. Awaits payment provider
  (YooKassa/Stripe) + 152-FZ decision.
- F6 Notifications: see the dedicated section below (now implemented).
- F7 Verifications: table `verifications` + RLS. Awaits KYC provider.
- F13 Full B2B: deferred until B2C funnel proves out.
