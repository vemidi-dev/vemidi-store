-- Admin auth setup for /admin and /admin/login
-- Run this script in Supabase SQL Editor after products_table.sql

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

grant select on public.admin_users to authenticated;

drop policy if exists "admin_users_read_own_row" on public.admin_users;
create policy "admin_users_read_own_row"
on public.admin_users
for select
to authenticated
using (auth.uid() = user_id);

create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users a
    where a.user_id = uid
  );
$$;

revoke all on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to anon, authenticated;

-- Tighten products write access to admins only.
drop policy if exists "products_insert_authenticated" on public.products;
drop policy if exists "products_update_authenticated" on public.products;
drop policy if exists "products_delete_authenticated" on public.products;
drop policy if exists "products_insert_admin_only" on public.products;
drop policy if exists "products_update_admin_only" on public.products;
drop policy if exists "products_delete_admin_only" on public.products;
drop policy if exists "categories_insert_authenticated" on public.categories;
drop policy if exists "categories_update_authenticated" on public.categories;
drop policy if exists "categories_delete_authenticated" on public.categories;
drop policy if exists "categories_insert_admin_only" on public.categories;
drop policy if exists "categories_update_admin_only" on public.categories;
drop policy if exists "categories_delete_admin_only" on public.categories;
drop policy if exists "product_categories_insert_authenticated" on public.product_categories;
drop policy if exists "product_categories_update_authenticated" on public.product_categories;
drop policy if exists "product_categories_delete_authenticated" on public.product_categories;
drop policy if exists "product_categories_insert_admin_only" on public.product_categories;
drop policy if exists "product_categories_update_admin_only" on public.product_categories;
drop policy if exists "product_categories_delete_admin_only" on public.product_categories;
drop policy if exists "color_groups_insert_authenticated" on public.color_groups;
drop policy if exists "color_groups_update_authenticated" on public.color_groups;
drop policy if exists "color_groups_delete_authenticated" on public.color_groups;
drop policy if exists "color_groups_insert_admin_only" on public.color_groups;
drop policy if exists "color_groups_update_admin_only" on public.color_groups;
drop policy if exists "color_groups_delete_admin_only" on public.color_groups;
drop policy if exists "color_options_insert_authenticated" on public.color_options;
drop policy if exists "color_options_update_authenticated" on public.color_options;
drop policy if exists "color_options_delete_authenticated" on public.color_options;
drop policy if exists "color_options_insert_admin_only" on public.color_options;
drop policy if exists "color_options_update_admin_only" on public.color_options;
drop policy if exists "color_options_delete_admin_only" on public.color_options;
drop policy if exists "product_color_rules_insert_authenticated" on public.product_color_rules;
drop policy if exists "product_color_rules_update_authenticated" on public.product_color_rules;
drop policy if exists "product_color_rules_delete_authenticated" on public.product_color_rules;
drop policy if exists "product_color_rules_insert_admin_only" on public.product_color_rules;
drop policy if exists "product_color_rules_update_admin_only" on public.product_color_rules;
drop policy if exists "product_color_rules_delete_admin_only" on public.product_color_rules;
drop policy if exists "product_color_options_insert_authenticated" on public.product_color_options;
drop policy if exists "product_color_options_update_authenticated" on public.product_color_options;
drop policy if exists "product_color_options_delete_authenticated" on public.product_color_options;
drop policy if exists "product_color_options_insert_admin_only" on public.product_color_options;
drop policy if exists "product_color_options_update_admin_only" on public.product_color_options;
drop policy if exists "product_color_options_delete_admin_only" on public.product_color_options;
drop policy if exists "product_color_fields_insert_authenticated" on public.product_color_fields;
drop policy if exists "product_color_fields_update_authenticated" on public.product_color_fields;
drop policy if exists "product_color_fields_delete_authenticated" on public.product_color_fields;
drop policy if exists "product_color_fields_insert_admin_only" on public.product_color_fields;
drop policy if exists "product_color_fields_update_admin_only" on public.product_color_fields;
drop policy if exists "product_color_fields_delete_admin_only" on public.product_color_fields;
drop policy if exists "product_color_field_options_insert_authenticated" on public.product_color_field_options;
drop policy if exists "product_color_field_options_update_authenticated" on public.product_color_field_options;
drop policy if exists "product_color_field_options_delete_authenticated" on public.product_color_field_options;
drop policy if exists "product_color_field_options_insert_admin_only" on public.product_color_field_options;
drop policy if exists "product_color_field_options_update_admin_only" on public.product_color_field_options;
drop policy if exists "product_color_field_options_delete_admin_only" on public.product_color_field_options;

create policy "products_insert_admin_only"
on public.products
for insert
to authenticated
with check (public.is_admin(auth.uid()));

create policy "products_update_admin_only"
on public.products
for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "products_delete_admin_only"
on public.products
for delete
to authenticated
using (public.is_admin(auth.uid()));

create policy "categories_insert_admin_only"
on public.categories
for insert
to authenticated
with check (public.is_admin(auth.uid()));

create policy "categories_update_admin_only"
on public.categories
for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "categories_delete_admin_only"
on public.categories
for delete
to authenticated
using (public.is_admin(auth.uid()));

create policy "product_categories_insert_admin_only"
on public.product_categories
for insert
to authenticated
with check (public.is_admin(auth.uid()));

create policy "product_categories_update_admin_only"
on public.product_categories
for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "product_categories_delete_admin_only"
on public.product_categories
for delete
to authenticated
using (public.is_admin(auth.uid()));

create policy "color_groups_insert_admin_only"
on public.color_groups
for insert
to authenticated
with check (public.is_admin(auth.uid()));

create policy "color_groups_update_admin_only"
on public.color_groups
for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "color_groups_delete_admin_only"
on public.color_groups
for delete
to authenticated
using (public.is_admin(auth.uid()));

create policy "color_options_insert_admin_only"
on public.color_options
for insert
to authenticated
with check (public.is_admin(auth.uid()));

create policy "color_options_update_admin_only"
on public.color_options
for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "color_options_delete_admin_only"
on public.color_options
for delete
to authenticated
using (public.is_admin(auth.uid()));

create policy "product_color_rules_insert_admin_only"
on public.product_color_rules
for insert
to authenticated
with check (public.is_admin(auth.uid()));

create policy "product_color_rules_update_admin_only"
on public.product_color_rules
for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "product_color_rules_delete_admin_only"
on public.product_color_rules
for delete
to authenticated
using (public.is_admin(auth.uid()));

create policy "product_color_options_insert_admin_only"
on public.product_color_options
for insert
to authenticated
with check (public.is_admin(auth.uid()));

create policy "product_color_options_update_admin_only"
on public.product_color_options
for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "product_color_options_delete_admin_only"
on public.product_color_options
for delete
to authenticated
using (public.is_admin(auth.uid()));

create policy "product_color_fields_insert_admin_only"
on public.product_color_fields
for insert
to authenticated
with check (public.is_admin(auth.uid()));

create policy "product_color_fields_update_admin_only"
on public.product_color_fields
for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "product_color_fields_delete_admin_only"
on public.product_color_fields
for delete
to authenticated
using (public.is_admin(auth.uid()));

create policy "product_color_field_options_insert_admin_only"
on public.product_color_field_options
for insert
to authenticated
with check (public.is_admin(auth.uid()));

create policy "product_color_field_options_update_admin_only"
on public.product_color_field_options
for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "product_color_field_options_delete_admin_only"
on public.product_color_field_options
for delete
to authenticated
using (public.is_admin(auth.uid()));

-- Add your first admin (replace with your real auth email):
-- insert into public.admin_users (user_id)
-- select id
-- from auth.users
-- where email = 'you@example.com'
-- on conflict (user_id) do nothing;
