alter table public.categories
  add column if not exists image_url text;

alter table public.categories
  drop constraint if exists categories_image_url_check;

alter table public.categories
  add constraint categories_image_url_check
  check (image_url is null or nullif(btrim(image_url), '') is not null);
