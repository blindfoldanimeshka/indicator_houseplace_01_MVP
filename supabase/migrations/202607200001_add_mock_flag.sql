-- Add a flag so demo/seed listings can be visually marked as mock.
-- Mock listings stay visible in the public feed (per product decision)
-- but carry is_mock = true so the UI can show a MOCK badge and the
-- client can filter them out of "real" testing flows if needed.

alter table public.listings
  add column if not exists is_mock boolean not null default false;

comment on column public.listings.is_mock is
  'true for demo/seed listings — UI shows a MOCK badge; not for real testing.';
