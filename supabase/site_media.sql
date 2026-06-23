-- Administrator-managed site-wide hero and hub images.
-- Public visitors can read values; only administrators can change them.

create table if not exists public.site_media (
  key text primary key,
  label text not null,
  section text not null,
  sort_order integer not null default 0,
  image_url text,
  image_alt text,
  updated_at timestamptz not null default now(),
  constraint site_media_key_check check (
    key ~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$'
  ),
  constraint site_media_image_url_check check (
    image_url is null or nullif(btrim(image_url), '') is not null
  )
);

create index if not exists site_media_section_sort_idx
  on public.site_media (section, sort_order, key);

alter table public.site_media enable row level security;

grant select on public.site_media to anon, authenticated;
grant insert, update, delete on public.site_media to authenticated;

drop policy if exists "site_media_public_read" on public.site_media;
create policy "site_media_public_read"
on public.site_media
for select
to anon, authenticated
using (true);

drop policy if exists "site_media_admin_write" on public.site_media;
create policy "site_media_admin_write"
on public.site_media
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

insert into public.site_media (key, label, section, sort_order) values
  ('home.hero', 'Начало — основна hero снимка', 'Начална страница', 10),
  ('home.atelier', 'Начало — секция ателието', 'Начална страница', 20),
  ('shop.hero', 'Продукти — hero банер', 'Hub страници', 10),
  ('categories.hero', 'Категории — hero банер', 'Hub страници', 20),
  ('occasions.hero', 'По повод — hero банер', 'Hub страници', 30),
  ('blog.hero', 'Блог — hero банер', 'Hub страници', 40),
  ('events.hero', 'Събития — hero банер', 'Hub страници', 50),
  ('about.hero', 'За нас — основна снимка', 'Други страници', 10),
  ('checkout.thank_you', 'Благодарим за поръчката — снимка', 'Други страници', 20)
on conflict (key) do nothing;
