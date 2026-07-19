-- Фаза 8 (размещение жилья): адрес и координаты объявления.
alter table public.listings
  add column if not exists address text not null default ''
    check (char_length(address) <= 300),
  add column if not exists lat double precision,
  add column if not exists lng double precision;

-- Координаты должны быть валидными, если указаны.
alter table public.listings
  add constraint listings_coords_check
  check (
    (lat is null and lng is null)
    or (lat between -90 and 90 and lng between -180 and 180)
  );
