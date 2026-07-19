-- Seed 4 fake authors (auth.users + public.users) and 30 mock listings
-- (3 pages of ~10). Mock listings are flagged is_mock = true and
-- remain visible in the public feed, marked with a MOCK badge.
--
-- NOTE: public.users profiles for these authors are created automatically
-- by the existing trigger/flow; this migration ensures the auth rows
-- exist and back-fills display name/city if needed.

-- 1) Fake authors in auth.users (minimal, cannot actually log in)
insert into auth.users (id, email, encrypted_password, is_sso_user, is_anonymous, raw_app_meta_data)
select
  ('00000000-0000-4000-8000-' || lpad((g * 4096)::text, 12, '0'))::uuid,
  'mock-author-' || g || '@example.com',
  crypt('mockpass123', gen_salt('bf')),
  false,
  false,
  '{"provider":"email","providers":["email"]}'::jsonb
from generate_series(1, 4) as g
on conflict (id) do nothing;

-- 2) Make sure public.users profiles exist with readable names/cities
insert into public.users (id, name, city)
select
  u.id,
  'Mock Author ' || row_number() over (order by u.id),
  (array['Москва','Санкт-Петербург','Казань','Новосибирск'])[row_number() over (order by u.id) % 4 + 1]
from auth.users u
where u.email like 'mock-author-%@example.com'
  and not exists (select 1 from public.users p where p.id = u.id)
on conflict (id) do nothing;

update public.users
set name = 'Mock Author 1', city = 'Москва'
where id = '00000000-0000-4000-8000-000000004096';
update public.users
set name = 'Mock Author 2', city = 'Санкт-Петербург'
where id = '00000000-0000-4000-8000-000000008192';
update public.users
set name = 'Mock Author 3', city = 'Казань'
where id = '00000000-0000-4000-8000-000000012288';
update public.users
set name = 'Mock Author 4', city = 'Новосибирск'
where id = '00000000-0000-4000-8000-000000016384';

-- 3) 30 mock listings: 10 per "page", rotating authors / types / cities
insert into public.listings
  (id, author_id, type, city, rooms, price, area, description, status, address, lat, lng, is_mock)
select
  gen_random_uuid(),
  (array(
    select u.id from auth.users u
    where u.email like 'mock-author-%@example.com'
    order by u.id
  ))[ (g % 4) + 1 ],
  (array['offer','request']::listing_type[])[ (g % 2) + 1 ],
  (array['Москва','Санкт-Петербург','Казань','Новосибирск','Екатеринбург'])[ (g % 5) + 1 ],
  (array['studio','1','2','3','4+'])[ (g % 5) + 1 ],
  15000 + (g * 3500) % 120000,
  20 + (g % 80),
  'Демонстрационное объявление #' || g || '. Не предназначено для реального бронирования или тестирования.',
  'active',
  'ул. Примерная, ' || g,
  55.75 + (g % 10) * 0.01,
  37.61 + (g % 10) * 0.01,
  true
from generate_series(1, 30) as g;
