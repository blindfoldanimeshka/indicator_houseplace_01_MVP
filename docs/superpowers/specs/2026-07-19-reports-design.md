# Design: Phase 7 — Reports and final hardening (MVP «напрямую»)

- Date: 2026-07-19
- Status: approved (autonomous mode per user instruction)
- Roadmap ref: technical-specification-roadmap.md §4.5, §5, §7 Phase 7, §9
- Depends on: Phases 3–6; DB table `reports` (applied in initial migration) with RLS (user sees own, creates own with status='new')

## Goal

Give users a "Пожаловаться" path from a listing and from a chat, persisted to
the `reports` table. Add a minimal `moderation_audit` table for moderator
actions (moderation stays via SQL console per §4.5 MVP — no admin UI). Close
the phase with a negative RLS test suite proving isolation between two users,
and a security review note.

## Scope (YAGNI)

- No moderator/admin UI. Moderation = SQL console with service role (per §4.5).
- No backup-restore automation (roadmap §7 mentions a manual restore test; we
  document it, do not automate).
- No automated accessibility audit tooling (manual smoke only; note in report).

## Success criteria

1. From ListingDetail and Thread, an authenticated user can open a report form
   (category + comment ≤1000), submit → row in `reports` (reporter_id=self,
   status='new', target_type/listing or chat id). One open report per
   (reporter, target) enforced by DB unique partial index.
2. User sees only their own submitted report state ("отправлено"); cannot read
   others' reports (RLS).
3. `moderation_audit` table exists for moderator actions (inserted manually by
   service role, not from client).
4. Negative RLS tests prove: user B cannot read/modify user A's profile,
   listing, chat, message, photo, or report (except public feed).
5. Security review: only the expected SECURITY DEFINER warning remains
   (open_or_create_chat, intentional).

## Architecture

- `src/features/reports/reportSchema.ts` — Zod: category 1..50, comment 0..1000,
  target_type enum 'listing'|'chat'|'message'.
- `src/features/reports/reportApi.ts`:
  - `createReport({ targetType, targetId, category, comment })` →
    `from('reports').insert({ reporter_id: user.id, target_type, target_id, category, comment, status:'new' })`.
  - `getMyReport(targetType, targetId)` → select own report if any.
- `src/features/reports/ReportButton.tsx` — button + inline dialog/form
  (category select + comment textarea + submit), uses useAuth for reporter_id.
  Shows "Жалоба отправлена" after success.
- Wire `ReportButton` into `ListingDetail` (targetType 'listing', listing.id)
  and `Thread` (targetType 'chat', chatId).
- Migration `202607190003_moderation_audit.sql` — create `moderation_audit`
  (id, moderator_id uuid refs users, action text, target_type, target_id,
  note text, created_at) with RLS: NO client access (revoke all from anon/
  authenticated; only service role inserts). This satisfies §5 invariant.
- `tests/db/rls.test.ts` (or `src/features/.../rls.test.ts`) — integration-style
  negative RLS tests. Since we run unit tests with a mocked client, we instead
  add a **DB-level RLS test file** that documents/asserts expectations; if a real
  Supabase test DB is available we run it, otherwise we keep assertions as a
  documented checklist + unit tests on reportApi policies via mocked client.
  For this phase: add unit tests for reportApi (create sets reporter_id+status;
  validation rejects bad category/comment) and a `docs/security-review.md`
  capturing the RLS isolation matrix + the one accepted warning.

## Data flow

Report submit → reportApi.createReport → supabase insert (RLS enforces
reporter_id=self, status='new', one-open-per-target). Moderation done out of
band via service role SQL console, appending to moderation_audit.

## Validation

Zod: category 1..50 chars, comment ≤1000. DB constraints mirror this + unique
partial index on (reporter_id, target_type, target_id) where status in
('new','reviewed').

## Error handling

Submit: loading/error/success states. Unique-violation (already reported)
surfaced as "вы уже пожаловались".

## Testing (qa-engineer)

- Unit reportApi: create sets reporter_id from arg/user + status 'new'; rejects
  bad category/comment; getMyReport filters by reporter.
- Unit reportSchema: bounds.
- Component ReportButton: opens form, validates, submits, shows success.
- Security review doc + RLS isolation checklist.
- Keep all existing tests green; target ≥8 new tests.

## Rollout

backend-dev applies moderation_audit migration; frontend-dev builds report UI;
qa-engineer adds tests + security doc; run lint/typecheck/test; commit. Push on
user request.
