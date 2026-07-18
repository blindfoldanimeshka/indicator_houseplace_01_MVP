# Design: Phase 4 — Listings CRUD and Feed (MVP «напрямую»)

- Date: 2026-07-19
- Status: approved (autonomous mode per user instruction)
- Roadmap ref: technical-specification-roadmap.md §4.2, §7 Phase 4, §8 task 6
- Depends on: Phase 3 (auth context `useAuth` provides current user)

## Goal

End-to-end listing management: an authenticated user creates, edits, and
archives (soft-deletes) their own listings; anyone (including guests) browses
a public feed of `active`, non-deleted listings with filters and pagination.
This is the vertical slice that proves "create → see → edit → archive" and the
public feed isolation required by Phase 4 success criteria.

## Scope (YAGNI)

- No photos yet (Phase 5). No chat from listing yet (Phase 6).
- No `pending` moderation status (decision in progress.md): listings are
  created as `active`. Archive = soft delete via `deleted_at`.
- Filters: type (offer/request), city (text contains/exact), rooms, max price,
  sort "newest first". Pagination via `range()`.

## Success criteria

1. Authenticated user opens "New listing" → fills form (type, city, rooms,
   price, area?, description?) → on submit a row is inserted with
   `author_id = current user` and `status = 'active'`.
2. Author sees their own listings (including archived) in "My listings".
3. Author can edit their listing (cannot change author_id/status/created_at —
   enforced by DB trigger + RLS); archived listing cannot be un-archived.
4. Author can archive (soft delete) their listing; it disappears from public
   feed but stays in "My listings" marked archived.
5. Public feed shows only `active` + not deleted listings; supports filters
   and pagination; loading/empty/error states present.
6. A listing detail view is reachable by id (public URL/`?listing=id`).

## Architecture

- `src/features/listings/api.ts` — Supabase queries:
  `createListing`, `updateListing`, `archiveListing`, `getListing`,
  `listListings(filters, page)` (public, no auth required for read).
- `src/features/listings/listingSchema.ts` — Zod schema for listing form:
  type enum, city 2–100, rooms enum, price int 1..10_000_000, area int 1..10000
  optional, description 0..2000.
- `src/features/listings/ListingForm.tsx` — create/edit form.
- `src/features/listings/ListingCard.tsx` — card for feed (DirectionTag-like
  badge "Сдаётся"/"Ищу" by type).
- `src/features/listings/Feed.tsx` — public feed with filters + pagination.
- `src/features/listings/MyListings.tsx` — author's listings + archive action.
- `src/features/listings/ListingDetail.tsx` — single listing view.
- `src/app/App.tsx` — view-state: 'home' (feed) | 'new' | 'mine' | 'detail' |
  'profile'; nav wiring. Reuse AppShell.
- `src/types/database.ts` — extend `listings` Row/Insert/Update with
  `status`, `updated_at`; add `listing_type`/`listing_status` enums if useful
  (keep simple: use string union).
- `src/features/listings/types.ts` — already exists (empty-ish); extend with
  shared TS types (`ListingFilters`, `ListingFormValues`).

## Data flow

1. Feed mounts → `listListings(filters, 0)` → `supabase.from('listings')
   .select().eq('status','active').is('deleted_at', null)` + filters + `.order('created_at', {desc}).range(0, PAGE)`.
2. Create → `supabase.from('listings').insert({...values, author_id: user.id,
   status:'active'}).select().single()`.
3. Edit → `supabase.from('listings').update(values).eq('id', id)
   .eq('author_id', user.id)`.
4. Archive → `supabase.from('listings').update({ deleted_at: now })
   .eq('id', id).eq('author_id', user.id)`.
5. Detail → `getListing(id)`; public read allowed by RLS.

## Validation (Zod, client UX) + DB constraints

Mirror DB CHECK constraints: city trim 2–100, rooms in enum, price 1..1e7,
area 1..10000 optional, description ≤2000, type offer/request.

## Error handling

All queries return `{ data, error }`; UI shows inline errors, loading and
empty states. Unauthorized create/edit blocked (auth guard + RLS).

## Testing (qa-engineer)

- Unit `api.ts` with mocked supabase: create sets author_id+status; list applies
  status/deleted_at filters; archive sets deleted_at.
- Component: ListingForm validation; Feed renders cards; empty/error states.
- Keep all existing tests green; target ≥10 new tests.

## Rollout

frontend-dev builds api + components + App wiring; qa-engineer adds tests;
run lint/typecheck/test; commit. Push only on user request.
