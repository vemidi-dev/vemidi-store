-- Admin-managed blog categories with legacy blog_posts.category backfill.
-- Safe to run after blog_and_events.sql and admin_auth.sql.

create table if not exists public.blog_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  description text null,
  image_url text null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint blog_categories_slug_check check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint blog_categories_slug_unique unique (slug)
);

create index if not exists blog_categories_active_sort_idx
  on public.blog_categories (is_active, sort_order, name);

alter table public.blog_posts
  add column if not exists blog_category_id uuid
    references public.blog_categories (id) on delete set null;

create index if not exists blog_posts_blog_category_id_idx
  on public.blog_posts (blog_category_id);

alter table public.blog_categories enable row level security;

grant select on public.blog_categories to anon, authenticated;
grant insert, update, delete on public.blog_categories to authenticated;

drop policy if exists "blog_categories_public_read" on public.blog_categories;
create policy "blog_categories_public_read"
on public.blog_categories
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "blog_categories_admin_read" on public.blog_categories;
create policy "blog_categories_admin_read"
on public.blog_categories
for select
to authenticated
using (public.is_admin(auth.uid()));

drop policy if exists "blog_categories_admin_write" on public.blog_categories;
create policy "blog_categories_admin_write"
on public.blog_categories
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- Backfill categories from distinct legacy blog_posts.category values.
with distinct_categories as (
  select distinct trim(category) as name
  from public.blog_posts
  where category is not null
    and trim(category) <> ''
),
prepared as (
  select
    name,
    coalesce(
      nullif(public.slugify_product_name(name), ''),
      'category-' || substr(md5(name), 1, 8)
    ) as base_slug
  from distinct_categories
),
numbered as (
  select
    name,
    case
      when count(*) over (partition by base_slug) > 1
        then base_slug || '-' || substr(md5(name), 1, 4)
      else base_slug
    end as slug,
    row_number() over (order by name) - 1 as sort_order
  from prepared
)
insert into public.blog_categories (name, slug, sort_order)
select name, slug, sort_order
from numbered
on conflict (slug) do nothing;

update public.blog_posts post
set blog_category_id = category_row.id
from public.blog_categories category_row
where post.blog_category_id is null
  and post.category is not null
  and trim(post.category) = category_row.name;
