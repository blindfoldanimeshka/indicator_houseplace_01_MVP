# Design: Phase 5 — Listing Photos (MVP «напрямую»)

- Date: 2026-07-19
- Status: approved (autonomous mode per user instruction)
- Roadmap ref: technical-specification-roadmap.md §4.3, §7 Phase 5, §8 task 6
- Depends on: Phase 4 (listings CRUD), DB migration `202607190002_listing_photos.sql` (applied)

## Goal

Let an authenticated listing author attach up to 10 photos (JPEG/PNG/WebP,
≤10 MB each) to their listing, stored in a Supabase Storage bucket with
strict RLS so only the listing author can upload/delete. Photos are publicly
readable (MVP simplification per §4.3) via a metadata table `listing_images`.

## Scope (YAGNI)

- No server-side image validation/signature check (deferred; client + bucket
  MIME/size limits + Storage RLS are sufficient for MVP).
- No WebP re-encoding preview variant yet (deferred).
- No automatic photo deletion on archive beyond what `ON DELETE CASCADE` on
  `listing_images` gives; storage objects cleaned best-effort by the UI.

## Success criteria

1. Author can add up to 10 images to a listing; each ≤10 MB, MIME in
   JPEG/PNG/WebP; others rejected client-side with a clear message.
2. Upload path is `listing/{listingId}/{uuid}.{ext}` — unpredictable, never
   the user-supplied filename.
3. Only the author can upload/delete files (enforced by Storage RLS +
   `private.is_listing_author`).
4. Public feed/cards show the first photo; detail view shows all photos.
5. Removing a photo deletes both the storage object and the metadata row.
6. A non-author cannot read/write the author's photos via Storage API.

## Architecture

- `src/features/photos/photoApi.ts` — `uploadPhoto(listingId, file)` (builds
  path, uploads to `listing-photos` bucket, inserts `listing_images` row),
  `listPhotos(listingId)`, `removePhoto(listingId, imageId, path)`,
  `getPublicUrl(path)`.
- `src/features/photos/PhotoUploader.tsx` — file input + preview grid,
  client validation (count/type/size), calls `uploadPhoto`/`removePhoto`.
- `src/features/photos/photoSchema.ts` — Zod: max 10 files, each
  type in allowed set, size ≤10MB.
- Integrate `PhotoUploader` into `ListingForm` (after create, or on edit if
  listing already has an id).
- `ListingCard` shows first photo (via `getPublicUrl`); `ListingDetail` shows
  gallery.
- `src/types/database.ts` — add `listing_images` table type.

## Data flow

1. On create: after `createListing` returns the row id, for each selected
   file: `uploadPhoto(listingId, file)` → `storage.from('listing-photos')
   .upload(\`listing/${id}/${uuid}.${ext}\`, file)` → on success insert
   `listing_images { listing_id, path, mime_type, size_bytes, sort_order }`.
2. List: `supabase.from('listing_images').select().eq('listing_id', id)
   .order('sort_order')`.
3. Public URL: `supabase.storage.from('listing-photos').getPublicUrl(path)`.
4. Remove: delete storage object + delete metadata row in a best-effort
   sequence (delete object first, then row).

## Validation

Client: count ≤10, MIME allowed, size ≤10MB. Bucket also enforces
file_size_limit + allowed_mime_types. Storage RLS enforces author ownership.
Metadata table RLS enforces author for insert/delete, public for select.

## Error handling

Upload errors surfaced inline; partial failures handled (keep what succeeded,
report which failed). Loading states per file.

## Testing (qa-engineer)

- Unit `photoApi.ts` with mocked supabase: upload builds correct path and
  inserts metadata; rejects wrong type/size before calling storage; remove
  deletes object + row; getPublicUrl returns url.
- Component: PhotoUploader validation (too many / wrong type / too big);
  shows previews.
- Keep all existing tests green; target ≥8 new tests.

## Rollout

backend already applied via migration; frontend-dev builds api + components +
integration; qa-engineer adds tests; run lint/typecheck/test; commit. Push on
user request.
