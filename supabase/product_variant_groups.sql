-- Stage 1: Expand product_materials into a general Variants system.
-- Run manually in Supabase SQL Editor. Safe to re-run.
-- Does NOT rename product_materials or product_option_values.material_id
-- (backward compatible with existing option-value links).

-- ---------------------------------------------------------------------------
-- 1) Variant groups (e.g. Материал, future: Вид комплект, Стил, Форма)
-- ---------------------------------------------------------------------------

create table if not exists public.product_variant_groups (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  name text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_variant_groups_key_check
    check (key ~ '^[a-z][a-z0-9_]{0,63}$'),
  constraint product_variant_groups_name_check
    check (char_length(trim(name)) between 1 and 120),
  constraint product_variant_groups_description_check
    check (description is null or char_length(description) <= 500)
);

create unique index if not exists product_variant_groups_key_uidx
  on public.product_variant_groups (key);

create index if not exists product_variant_groups_sort_order_idx
  on public.product_variant_groups (sort_order asc, name asc);

alter table public.product_variant_groups enable row level security;

grant select on table public.product_variant_groups to anon, authenticated;
grant insert, update, delete on table public.product_variant_groups to authenticated;

drop policy if exists "product_variant_groups_select_all" on public.product_variant_groups;
create policy "product_variant_groups_select_all"
on public.product_variant_groups
for select
to anon, authenticated
using (true);

drop policy if exists "product_variant_groups_insert_admin" on public.product_variant_groups;
create policy "product_variant_groups_insert_admin"
on public.product_variant_groups
for insert
to authenticated
with check (public.is_admin((select auth.uid())));

drop policy if exists "product_variant_groups_update_admin" on public.product_variant_groups;
create policy "product_variant_groups_update_admin"
on public.product_variant_groups
for update
to authenticated
using (public.is_admin((select auth.uid())))
with check (public.is_admin((select auth.uid())));

drop policy if exists "product_variant_groups_delete_admin" on public.product_variant_groups;
create policy "product_variant_groups_delete_admin"
on public.product_variant_groups
for delete
to authenticated
using (public.is_admin((select auth.uid())));

-- Seed default group for existing materials library.
insert into public.product_variant_groups (key, name, description, sort_order, is_active)
values (
  'material',
  'Материал',
  'Съществуващата библиотека материали/текстури (Stage 1 default group).',
  0,
  true
)
on conflict (key) do update
set
  name = excluded.name,
  description = coalesce(public.product_variant_groups.description, excluded.description),
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 2) Extend product_materials (variants rows) — keep table name + material_id
-- ---------------------------------------------------------------------------

alter table public.product_materials
  add column if not exists group_id uuid
    references public.product_variant_groups (id)
    on delete restrict;

alter table public.product_materials
  add column if not exists display_size text;

-- Default layout size: medium = current storefront (1 col mobile, 2 cols sm+)
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'product_materials_display_size_check'
  ) then
    alter table public.product_materials
      add constraint product_materials_display_size_check
      check (
        display_size is null
        or display_size in ('small', 'medium', 'large')
      );
  end if;
end $$;

update public.product_materials
set display_size = 'medium'
where display_size is null;

alter table public.product_materials
  alter column display_size set default 'medium';

-- Backfill every existing material into the Материал group.
update public.product_materials pm
set group_id = vg.id
from public.product_variant_groups vg
where vg.key = 'material'
  and pm.group_id is null;

create index if not exists product_materials_group_id_idx
  on public.product_materials (group_id);

create index if not exists product_materials_group_sort_idx
  on public.product_materials (group_id, sort_order asc, name asc);

comment on table public.product_variant_groups is
  'Groups of visual variants (Material, Kit type, Style, …). Stage 1 seeds Материал.';

comment on table public.product_materials is
  'Visual variant rows (legacy name product_materials). Linked from product_option_values.material_id.';

comment on column public.product_materials.display_size is
  'Storefront card density: small (compact multi-col), medium (2/row = current), large (1/row). Stage 1 unused on storefront.';

comment on column public.product_materials.group_id is
  'FK to product_variant_groups. Existing rows backfilled to key=material.';
