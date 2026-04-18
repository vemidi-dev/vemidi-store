-- Migration script for existing databases:
-- convert products.category (single text) -> categories + product_categories (many-to-many)

create extension if not exists pgcrypto;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (product_id, category_id)
);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'products'
      and column_name = 'category'
  ) then
    insert into public.categories (name, slug)
    select distinct p.category, 'legacy-' || substr(md5(p.category), 1, 12)
    from public.products p
    where p.category is not null and btrim(p.category) <> ''
    on conflict (slug) do update set name = excluded.name;

    insert into public.product_categories (product_id, category_id)
    select p.id, c.id
    from public.products p
    join public.categories c on c.name = p.category
    where p.category is not null and btrim(p.category) <> ''
    on conflict (product_id, category_id) do nothing;

    alter table public.products drop column category;
  end if;
end $$;

drop index if exists public.products_category_idx;
create index if not exists product_categories_product_id_idx on public.product_categories (product_id);
create index if not exists product_categories_category_id_idx on public.product_categories (category_id);
