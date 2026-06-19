-- Product landing pages for campaign URLs on special.vemidi-crafts.com/{slug}.
-- Run after product_content_hierarchy.sql. Do not execute automatically from the app.
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE where applicable.

begin;

create table if not exists public.product_landing_pages (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  title text not null,
  slug text not null,
  campaign_code text,
  is_primary boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_landing_pages_title_check check (char_length(btrim(title)) >= 1),
  constraint product_landing_pages_slug_check check (
    slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    and char_length(slug) <= 80
  ),
  constraint product_landing_pages_campaign_code_check check (
    campaign_code is null
    or (
      campaign_code ~ '^[a-z0-9][a-z0-9_-]*$'
      and char_length(campaign_code) <= 64
    )
  ),
  constraint product_landing_pages_sort_order_check check (sort_order >= 0)
);

create unique index if not exists product_landing_pages_slug_key
  on public.product_landing_pages (slug);

create unique index if not exists product_landing_pages_primary_product_idx
  on public.product_landing_pages (product_id)
  where is_primary = true;

create index if not exists product_landing_pages_product_active_idx
  on public.product_landing_pages (product_id, is_active, sort_order, created_at);

create index if not exists product_landing_pages_campaign_code_idx
  on public.product_landing_pages (campaign_code)
  where campaign_code is not null;

drop trigger if exists product_landing_pages_set_updated_at on public.product_landing_pages;
create trigger product_landing_pages_set_updated_at
before update on public.product_landing_pages
for each row
execute function public.set_updated_at();

alter table public.product_landing_pages enable row level security;

grant select on public.product_landing_pages to anon, authenticated;
grant insert, update, delete on public.product_landing_pages to authenticated;

drop policy if exists "product_landing_pages_public_read"
  on public.product_landing_pages;
create policy "product_landing_pages_public_read"
on public.product_landing_pages
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "product_landing_pages_admin_read"
  on public.product_landing_pages;
create policy "product_landing_pages_admin_read"
on public.product_landing_pages
for select
to authenticated
using (public.is_admin(auth.uid()));

drop policy if exists "product_landing_pages_admin_write"
  on public.product_landing_pages;
create policy "product_landing_pages_admin_write"
on public.product_landing_pages
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

commit;
