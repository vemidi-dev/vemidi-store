alter table public.categories
  add column if not exists image_alt text;

alter table public.categories
  add column if not exists cover_image_url text;

alter table public.categories
  add column if not exists cover_image_alt text;

alter table public.categories
  drop constraint if exists categories_cover_image_url_check;

alter table public.categories
  add constraint categories_cover_image_url_check
  check (cover_image_url is null or nullif(btrim(cover_image_url), '') is not null);
