-- Separate catalog categories into product types and gift occasions.
-- Safe to run on an existing installation. Existing categories default to "product"
-- and can be reclassified from the admin panel.

alter table public.categories
  add column if not exists category_type text not null default 'product';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'categories_type_check'
      and conrelid = 'public.categories'::regclass
  ) then
    alter table public.categories
      add constraint categories_type_check
      check (category_type in ('product', 'occasion'));
  end if;
end
$$;

create index if not exists categories_type_name_idx
  on public.categories (category_type, name);

-- Table privileges are required in addition to the existing admin-only RLS policies.
grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;

drop policy if exists "categories_read_public" on public.categories;
create policy "categories_read_public"
on public.categories
for select
to anon, authenticated
using (true);

drop policy if exists "categories_insert_authenticated" on public.categories;
drop policy if exists "categories_update_authenticated" on public.categories;
drop policy if exists "categories_delete_authenticated" on public.categories;
drop policy if exists "categories_insert_admin_only" on public.categories;
drop policy if exists "categories_update_admin_only" on public.categories;
drop policy if exists "categories_delete_admin_only" on public.categories;

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
