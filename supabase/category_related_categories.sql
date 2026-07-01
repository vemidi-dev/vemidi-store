-- Curated cross-links between categories without changing parent_id hierarchy.
-- Safe to run after category_hierarchy.sql and admin_auth.sql.

create table if not exists public.category_related_categories (
  category_id uuid not null
    references public.categories (id) on delete cascade,
  related_category_id uuid not null
    references public.categories (id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (category_id, related_category_id),
  constraint category_related_not_self
    check (category_id <> related_category_id)
);

create index if not exists category_related_categories_related_idx
  on public.category_related_categories (related_category_id);

create index if not exists category_related_categories_source_sort_idx
  on public.category_related_categories (category_id, sort_order);

alter table public.category_related_categories enable row level security;

grant select on public.category_related_categories to anon, authenticated;
grant insert, update, delete on public.category_related_categories to authenticated;

drop policy if exists "category_related_categories_public_read"
  on public.category_related_categories;
create policy "category_related_categories_public_read"
on public.category_related_categories
for select
to anon, authenticated
using (true);

drop policy if exists "category_related_categories_admin_write"
  on public.category_related_categories;
create policy "category_related_categories_admin_write"
on public.category_related_categories
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));
