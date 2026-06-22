-- Manual storefront visibility toggle for categories.
-- Run after existing category migrations. Safe to re-run.

begin;

alter table public.categories
  add column if not exists is_visible boolean not null default true;

create index if not exists categories_category_type_is_visible_idx
  on public.categories (category_type, is_visible, home_sort_order, name);

commit;
