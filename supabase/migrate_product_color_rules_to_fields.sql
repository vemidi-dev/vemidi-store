-- Optional migration from old product_color_rules/product_color_options
-- to dynamic product_color_fields/product_color_field_options.
-- Safe to run multiple times.

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

with inserted as (
  insert into public.product_color_fields (product_id, group_id, label, enabled, min_select, max_select, sort_order)
  select
    r.product_id,
    r.group_id,
    coalesce(g.label, 'Цветове'),
    r.enabled,
    r.min_select,
    r.max_select,
    row_number() over (partition by r.product_id order by r.created_at, r.id) - 1
  from public.product_color_rules r
  left join public.color_groups g on g.id = r.group_id
  where not exists (
    select 1
    from public.product_color_fields f
    where f.product_id = r.product_id
      and f.group_id = r.group_id
      and f.label = coalesce(g.label, 'Цветове')
      and f.min_select = r.min_select
      and f.max_select = r.max_select
  )
  returning id, product_id, group_id
)
insert into public.product_color_field_options (field_id, color_option_id)
select
  f.id,
  o.color_option_id
from public.product_color_fields f
join public.product_color_options o
  on o.product_id = f.product_id
 and o.group_id = f.group_id
left join public.product_color_field_options existing
  on existing.field_id = f.id
 and existing.color_option_id = o.color_option_id
where existing.id is null;
