# SaaS layer — implementation report

Project: **napryamuyu** (direct rentals, no brokers). Stack: React 19 + Vite + TS + Supabase.
Date: 2026-07-20. Author: Sisyphus (direct execution; the `deep` subagent
category is unstable in this environment — see "Infra" below).

## Feature status (F1–F13)

| # | Feature | Status | What was done |
|---|---------|--------|---------------|
| F1 | Organizations (B2B seed) | Done | Tables + RPCs + client + Profile tab |
| F2 | Billing/subscriptions | Schema only | `plans`/`subscriptions` tables + RLS. Provider + 152-FZ = user decision |
| F3 | Limit 5 listings/month | Done | `enforce_listing_limit` trigger in DB |
| F4 | Listing promotion | Done | RPC `boost_listing` + button on detail view |
| F5 | Listing statistics | Done | `listing_stats` + `record_*` RPCs + "Popular" sort |
| F6 | Notifications | Schema only | `notification_prefs`/`notifications` + RLS. SMTP = user decision |
| F7 | Verifications (KYC) | Schema only | `verifications` + RLS. Provider = user decision |
| F8 | Post-deal reviews | Done | Table + RPC `create_review` + form in chat |
| F9 | Message templates | Done | Table + client + chips in chat composer |
| F10 | Chat attachments | Done | `messages.attachment_*` columns + UI |
| F11 | Chat lifecycle | Done | `chats.status` + `closeChat` + "Close" button |
| F12 | Funnel analytics | Done | `funnel_events` table + Edge Function `track-event` |
| F13 | Full B2B | Deferred | Needs B2C validation (user decision) |

## How to verify

```bash
npm run typecheck   # tsc -b — clean
npm run test        # vitest — 182 passed, 3 pre-existing fails (see below)
```

The 3 remaining failures are **unrelated** to the SaaS layer:
- `tests/features/profile/ProfilePage.test.tsx` — tests expect content for the
  "Аккаунт"/"Подключения"/"Действия" tabs (DangerTab/ConnectionsTab).
  That is separate work, not part of the F1–F12 SaaS package.
- `.skill-tmp/cli/tests/e2e/preview.spec.ts` — Playwright e2e; the
  `@playwright/test` dep is not installed in this environment (infra, not code).

## Infra

- The `deep`/`unspecified-*` subagent category fails with "Streaming response failed"
  (~100% of attempts this session) and **writes nothing to disk**. The entire SaaS
  layer was therefore implemented directly by the host agent. This does not affect
  code quality, but means parallel subagent delegation is non-functional here.
- Migrations are written as files under `supabase/migrations/` but were **not applied**:
  no Supabase CLI in the environment (per `docs/backend-analysis.md`). Apply to a
  preview / MVP project after review.
- `src/types/database.ts` is a hand-extended version of the generated type (CLI
  unavailable). Tables and Functions were synced with the migrations manually.
