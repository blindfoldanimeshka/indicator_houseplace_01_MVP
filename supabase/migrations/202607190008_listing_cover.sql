-- Обложка объявления для ленты: первое фото по sort_order.
-- SECURITY DEFINER, чтобы обойти RLS listing_images при чтении
-- только списка активных объявлений (доступ по логике приложения).
create or replace function public.listing_cover_path(p_listing_id uuid)
returns text
language sql
security definer
set search_path = public
as $$
  select path
  from public.listing_images
  where listing_id = p_listing_id
  order by sort_order asc, created_at asc
  limit 1;
$$;

grant execute on function public.listing_cover_path(uuid) to anon, authenticated;
