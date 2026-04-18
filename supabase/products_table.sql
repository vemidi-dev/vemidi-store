-- Products table for admin CRUD in /admin
-- Run this script in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  additional_info text,
  fulfillment_note text,
  price numeric(10, 2) not null check (price >= 0),
  image_url text,
  is_customizable boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_created_at_idx on public.products (created_at desc);

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

create index if not exists product_categories_product_id_idx on public.product_categories (product_id);
create index if not exists product_categories_category_id_idx on public.product_categories (category_id);

create table if not exists public.color_groups (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  created_at timestamptz not null default now(),
  constraint color_groups_key_check check (key in ('paper', 'wood'))
);

create table if not exists public.color_options (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.color_groups (id) on delete cascade,
  name text not null,
  hex text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.product_color_rules (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  group_id uuid not null references public.color_groups (id) on delete cascade,
  enabled boolean not null default true,
  min_select integer not null default 0,
  max_select integer not null default 1,
  created_at timestamptz not null default now(),
  constraint product_color_rules_limits_check check (min_select >= 0 and max_select >= 1 and min_select <= max_select),
  unique (product_id, group_id)
);

create table if not exists public.product_color_options (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  group_id uuid not null references public.color_groups (id) on delete cascade,
  color_option_id uuid not null references public.color_options (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (product_id, color_option_id)
);

create index if not exists color_options_group_id_idx on public.color_options (group_id);
create index if not exists product_color_rules_product_id_idx on public.product_color_rules (product_id);
create index if not exists product_color_options_product_id_idx on public.product_color_options (product_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row
execute function public.set_updated_at();

alter table public.products enable row level security;
alter table public.categories enable row level security;
alter table public.product_categories enable row level security;
alter table public.color_groups enable row level security;
alter table public.color_options enable row level security;
alter table public.product_color_rules enable row level security;
alter table public.product_color_options enable row level security;

-- Table privileges
grant select on public.products to anon;
grant select, insert, update, delete on public.products to authenticated;
grant select on public.categories to anon;
grant select, insert, update, delete on public.categories to authenticated;
grant select on public.product_categories to anon;
grant select, insert, update, delete on public.product_categories to authenticated;
grant select on public.color_groups to anon;
grant select, insert, update, delete on public.color_groups to authenticated;
grant select on public.color_options to anon;
grant select, insert, update, delete on public.color_options to authenticated;
grant select on public.product_color_rules to anon;
grant select, insert, update, delete on public.product_color_rules to authenticated;
grant select on public.product_color_options to anon;
grant select, insert, update, delete on public.product_color_options to authenticated;

-- RLS policies
drop policy if exists "products_read_public" on public.products;
create policy "products_read_public"
on public.products
for select
to anon, authenticated
using (true);

drop policy if exists "products_insert_authenticated" on public.products;
create policy "products_insert_authenticated"
on public.products
for insert
to authenticated
with check (true);

drop policy if exists "products_update_authenticated" on public.products;
create policy "products_update_authenticated"
on public.products
for update
to authenticated
using (true)
with check (true);

drop policy if exists "products_delete_authenticated" on public.products;
create policy "products_delete_authenticated"
on public.products
for delete
to authenticated
using (true);

drop policy if exists "categories_read_public" on public.categories;
create policy "categories_read_public"
on public.categories
for select
to anon, authenticated
using (true);

drop policy if exists "categories_insert_authenticated" on public.categories;
create policy "categories_insert_authenticated"
on public.categories
for insert
to authenticated
with check (true);

drop policy if exists "categories_update_authenticated" on public.categories;
create policy "categories_update_authenticated"
on public.categories
for update
to authenticated
using (true)
with check (true);

drop policy if exists "categories_delete_authenticated" on public.categories;
create policy "categories_delete_authenticated"
on public.categories
for delete
to authenticated
using (true);

drop policy if exists "product_categories_read_public" on public.product_categories;
create policy "product_categories_read_public"
on public.product_categories
for select
to anon, authenticated
using (true);

drop policy if exists "product_categories_insert_authenticated" on public.product_categories;
create policy "product_categories_insert_authenticated"
on public.product_categories
for insert
to authenticated
with check (true);

drop policy if exists "product_categories_update_authenticated" on public.product_categories;
create policy "product_categories_update_authenticated"
on public.product_categories
for update
to authenticated
using (true)
with check (true);

drop policy if exists "product_categories_delete_authenticated" on public.product_categories;
create policy "product_categories_delete_authenticated"
on public.product_categories
for delete
to authenticated
using (true);

drop policy if exists "color_groups_read_public" on public.color_groups;
create policy "color_groups_read_public"
on public.color_groups
for select
to anon, authenticated
using (true);

drop policy if exists "color_groups_insert_authenticated" on public.color_groups;
create policy "color_groups_insert_authenticated"
on public.color_groups
for insert
to authenticated
with check (true);

drop policy if exists "color_groups_update_authenticated" on public.color_groups;
create policy "color_groups_update_authenticated"
on public.color_groups
for update
to authenticated
using (true)
with check (true);

drop policy if exists "color_groups_delete_authenticated" on public.color_groups;
create policy "color_groups_delete_authenticated"
on public.color_groups
for delete
to authenticated
using (true);

drop policy if exists "color_options_read_public" on public.color_options;
create policy "color_options_read_public"
on public.color_options
for select
to anon, authenticated
using (true);

drop policy if exists "color_options_insert_authenticated" on public.color_options;
create policy "color_options_insert_authenticated"
on public.color_options
for insert
to authenticated
with check (true);

drop policy if exists "color_options_update_authenticated" on public.color_options;
create policy "color_options_update_authenticated"
on public.color_options
for update
to authenticated
using (true)
with check (true);

drop policy if exists "color_options_delete_authenticated" on public.color_options;
create policy "color_options_delete_authenticated"
on public.color_options
for delete
to authenticated
using (true);

drop policy if exists "product_color_rules_read_public" on public.product_color_rules;
create policy "product_color_rules_read_public"
on public.product_color_rules
for select
to anon, authenticated
using (true);

drop policy if exists "product_color_rules_insert_authenticated" on public.product_color_rules;
create policy "product_color_rules_insert_authenticated"
on public.product_color_rules
for insert
to authenticated
with check (true);

drop policy if exists "product_color_rules_update_authenticated" on public.product_color_rules;
create policy "product_color_rules_update_authenticated"
on public.product_color_rules
for update
to authenticated
using (true)
with check (true);

drop policy if exists "product_color_rules_delete_authenticated" on public.product_color_rules;
create policy "product_color_rules_delete_authenticated"
on public.product_color_rules
for delete
to authenticated
using (true);

drop policy if exists "product_color_options_read_public" on public.product_color_options;
create policy "product_color_options_read_public"
on public.product_color_options
for select
to anon, authenticated
using (true);

drop policy if exists "product_color_options_insert_authenticated" on public.product_color_options;
create policy "product_color_options_insert_authenticated"
on public.product_color_options
for insert
to authenticated
with check (true);

drop policy if exists "product_color_options_update_authenticated" on public.product_color_options;
create policy "product_color_options_update_authenticated"
on public.product_color_options
for update
to authenticated
using (true)
with check (true);

drop policy if exists "product_color_options_delete_authenticated" on public.product_color_options;
create policy "product_color_options_delete_authenticated"
on public.product_color_options
for delete
to authenticated
using (true);

-- Dynamic color fields per product (label entered by admin)
create table if not exists public.product_color_fields (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  group_id uuid not null references public.color_groups (id) on delete cascade,
  label text not null,
  enabled boolean not null default true,
  min_select integer not null default 0,
  max_select integer not null default 1,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint product_color_fields_limits_check check (min_select >= 0 and max_select >= 1 and min_select <= max_select)
);

create table if not exists public.product_color_field_options (
  id uuid primary key default gen_random_uuid(),
  field_id uuid not null references public.product_color_fields (id) on delete cascade,
  color_option_id uuid not null references public.color_options (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (field_id, color_option_id)
);

create index if not exists product_color_fields_product_id_idx on public.product_color_fields (product_id);
create index if not exists product_color_field_options_field_id_idx on public.product_color_field_options (field_id);

alter table public.product_color_fields enable row level security;
alter table public.product_color_field_options enable row level security;

grant select on public.product_color_fields to anon;
grant select, insert, update, delete on public.product_color_fields to authenticated;
grant select on public.product_color_field_options to anon;
grant select, insert, update, delete on public.product_color_field_options to authenticated;

drop policy if exists "product_color_fields_read_public" on public.product_color_fields;
create policy "product_color_fields_read_public"
on public.product_color_fields
for select
to anon, authenticated
using (true);

drop policy if exists "product_color_fields_insert_authenticated" on public.product_color_fields;
create policy "product_color_fields_insert_authenticated"
on public.product_color_fields
for insert
to authenticated
with check (true);

drop policy if exists "product_color_fields_update_authenticated" on public.product_color_fields;
create policy "product_color_fields_update_authenticated"
on public.product_color_fields
for update
to authenticated
using (true)
with check (true);

drop policy if exists "product_color_fields_delete_authenticated" on public.product_color_fields;
create policy "product_color_fields_delete_authenticated"
on public.product_color_fields
for delete
to authenticated
using (true);

drop policy if exists "product_color_field_options_read_public" on public.product_color_field_options;
create policy "product_color_field_options_read_public"
on public.product_color_field_options
for select
to anon, authenticated
using (true);

drop policy if exists "product_color_field_options_insert_authenticated" on public.product_color_field_options;
create policy "product_color_field_options_insert_authenticated"
on public.product_color_field_options
for insert
to authenticated
with check (true);

drop policy if exists "product_color_field_options_update_authenticated" on public.product_color_field_options;
create policy "product_color_field_options_update_authenticated"
on public.product_color_field_options
for update
to authenticated
using (true)
with check (true);

drop policy if exists "product_color_field_options_delete_authenticated" on public.product_color_field_options;
create policy "product_color_field_options_delete_authenticated"
on public.product_color_field_options
for delete
to authenticated
using (true);
