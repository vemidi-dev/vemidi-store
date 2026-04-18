-- Product color configuration (groups, options, dynamic per-product fields)
-- Run in Supabase SQL Editor after products_table/admin_auth scripts.

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

create index if not exists color_options_group_id_idx on public.color_options (group_id);
create index if not exists product_color_fields_product_id_idx on public.product_color_fields (product_id);
create index if not exists product_color_field_options_field_id_idx on public.product_color_field_options (field_id);

alter table public.color_groups enable row level security;
alter table public.color_options enable row level security;
alter table public.product_color_fields enable row level security;
alter table public.product_color_field_options enable row level security;

grant select on public.color_groups to anon;
grant select, insert, update, delete on public.color_groups to authenticated;
grant select on public.color_options to anon;
grant select, insert, update, delete on public.color_options to authenticated;
grant select on public.product_color_fields to anon;
grant select, insert, update, delete on public.product_color_fields to authenticated;
grant select on public.product_color_field_options to anon;
grant select, insert, update, delete on public.product_color_field_options to authenticated;

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

-- Seed default groups
insert into public.color_groups (key, label)
values
  ('paper', 'Цвят на хартия'),
  ('wood', 'Цвят на дърво')
on conflict (key) do update set label = excluded.label;
