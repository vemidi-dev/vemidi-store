-- Visual materials library for future product option linking.
-- Run in Supabase SQL Editor. Does not change checkout or product options yet.

create table if not exists public.product_materials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  image_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_materials_name_check check (char_length(trim(name)) between 1 and 120),
  constraint product_materials_description_check check (
    description is null or char_length(description) <= 500
  )
);

create index if not exists product_materials_sort_order_idx
  on public.product_materials (sort_order asc, name asc);

create index if not exists product_materials_is_active_idx
  on public.product_materials (is_active);

alter table public.product_materials enable row level security;

grant select on table public.product_materials to anon, authenticated;
grant insert, update, delete on table public.product_materials to authenticated;

drop policy if exists "product_materials_select_all" on public.product_materials;
create policy "product_materials_select_all"
on public.product_materials
for select
to anon, authenticated
using (true);

drop policy if exists "product_materials_insert_admin" on public.product_materials;
create policy "product_materials_insert_admin"
on public.product_materials
for insert
to authenticated
with check (public.is_admin((select auth.uid())));

drop policy if exists "product_materials_update_admin" on public.product_materials;
create policy "product_materials_update_admin"
on public.product_materials
for update
to authenticated
using (public.is_admin((select auth.uid())))
with check (public.is_admin((select auth.uid())));

drop policy if exists "product_materials_delete_admin" on public.product_materials;
create policy "product_materials_delete_admin"
on public.product_materials
for delete
to authenticated
using (public.is_admin((select auth.uid())));

create or replace function public.admin_move_product_material(
  p_material_id uuid,
  p_direction text
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_current public.product_materials%rowtype;
  v_neighbor public.product_materials%rowtype;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if p_direction not in ('up', 'down') then
    raise exception 'invalid_direction' using errcode = '22023';
  end if;

  select *
    into v_current
    from public.product_materials
    where id = p_material_id
    for update;

  if not found then
    raise exception 'product_material_not_found' using errcode = 'P0002';
  end if;

  if p_direction = 'up' then
    select *
      into v_neighbor
      from public.product_materials
      where id <> v_current.id
        and sort_order < v_current.sort_order
      order by sort_order desc, name desc, id desc
      limit 1
      for update;
  else
    select *
      into v_neighbor
      from public.product_materials
      where id <> v_current.id
        and sort_order > v_current.sort_order
      order by sort_order asc, name asc, id asc
      limit 1
      for update;
  end if;

  if not found then
    return false;
  end if;

  update public.product_materials
  set
    sort_order = case
      when id = v_current.id then v_neighbor.sort_order
      when id = v_neighbor.id then v_current.sort_order
    end,
    updated_at = now()
  where id in (v_current.id, v_neighbor.id);

  return true;
end;
$$;

revoke all on function public.admin_move_product_material(uuid, text) from public;
grant execute on function public.admin_move_product_material(uuid, text) to authenticated;
