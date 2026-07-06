-- Manual migration: selected products under blog articles.
-- Run in Supabase SQL editor before using the admin blog product picker.

create table if not exists public.blog_post_products (
  blog_post_id uuid not null references public.blog_posts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (blog_post_id, product_id)
);

create index if not exists blog_post_products_blog_post_idx
  on public.blog_post_products (blog_post_id, sort_order);

create index if not exists blog_post_products_product_idx
  on public.blog_post_products (product_id);

alter table public.blog_post_products enable row level security;

grant select on public.blog_post_products to anon, authenticated;
grant insert, update, delete on public.blog_post_products to authenticated;

drop policy if exists "blog_post_products_public_read" on public.blog_post_products;
create policy "blog_post_products_public_read"
on public.blog_post_products
for select
using (
  exists (
    select 1
    from public.blog_posts post
    where post.id = blog_post_products.blog_post_id
      and post.is_published = true
  )
);

drop policy if exists "blog_post_products_admin_insert" on public.blog_post_products;
create policy "blog_post_products_admin_insert"
on public.blog_post_products
for insert
to authenticated
with check (public.is_admin(auth.uid()));

drop policy if exists "blog_post_products_admin_update" on public.blog_post_products;
create policy "blog_post_products_admin_update"
on public.blog_post_products
for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "blog_post_products_admin_delete" on public.blog_post_products;
create policy "blog_post_products_admin_delete"
on public.blog_post_products
for delete
to authenticated
using (public.is_admin(auth.uid()));
