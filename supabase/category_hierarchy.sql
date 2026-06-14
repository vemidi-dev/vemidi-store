-- Add one level of product subcategories.
-- Existing categories remain top-level because parent_id defaults to null.

begin;

alter table public.categories
  add column if not exists parent_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'categories_parent_id_fkey'
      and conrelid = 'public.categories'::regclass
  ) then
    alter table public.categories
      add constraint categories_parent_id_fkey
      foreign key (parent_id)
      references public.categories (id)
      on delete restrict;
  end if;
end;
$$;

create index if not exists categories_parent_order_idx
  on public.categories (category_type, parent_id, home_sort_order, name);

create or replace function public.validate_category_hierarchy()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_parent public.categories%rowtype;
begin
  if tg_op = 'UPDATE' and exists (
    select 1
    from public.categories
    where parent_id = new.id
  ) and (new.parent_id is not null or new.category_type <> 'product') then
    raise exception 'category_with_children_must_remain_top_level_product_category'
      using errcode = '23514';
  end if;

  if new.parent_id is null then
    return new;
  end if;

  if new.category_type <> 'product' then
    raise exception 'occasion_categories_cannot_have_parent'
      using errcode = '23514';
  end if;

  if new.parent_id = new.id then
    raise exception 'category_cannot_be_its_own_parent'
      using errcode = '23514';
  end if;

  select *
    into v_parent
    from public.categories
    where id = new.parent_id;

  if not found then
    raise exception 'category_parent_not_found'
      using errcode = '23503';
  end if;

  if v_parent.category_type <> 'product' then
    raise exception 'category_parent_must_be_product_category'
      using errcode = '23514';
  end if;

  if v_parent.parent_id is not null then
    raise exception 'category_hierarchy_supports_two_levels_only'
      using errcode = '23514';
  end if;

  new.show_on_home := false;
  return new;
end;
$$;

drop trigger if exists categories_validate_hierarchy on public.categories;
create trigger categories_validate_hierarchy
before insert or update of parent_id, category_type, show_on_home
on public.categories
for each row
execute function public.validate_category_hierarchy();

with ranked as (
  select
    id,
    row_number() over (
      partition by category_type, parent_id
      order by home_sort_order, name, id
    ) * 10 as position
  from public.categories
)
update public.categories as categories
set home_sort_order = ranked.position
from ranked
where categories.id = ranked.id;

create or replace function public.admin_move_home_category(
  p_category_id uuid,
  p_direction text
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_current public.categories%rowtype;
  v_neighbor public.categories%rowtype;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  if p_direction not in ('up', 'down') then
    raise exception 'invalid_direction' using errcode = '22023';
  end if;

  select *
    into v_current
    from public.categories
    where id = p_category_id
    for update;

  if not found then
    raise exception 'category_not_found' using errcode = 'P0002';
  end if;

  if p_direction = 'up' then
    select *
      into v_neighbor
      from public.categories
      where category_type = v_current.category_type
        and parent_id is not distinct from v_current.parent_id
        and id <> v_current.id
        and home_sort_order < v_current.home_sort_order
      order by home_sort_order desc, name desc, id desc
      limit 1
      for update;
  else
    select *
      into v_neighbor
      from public.categories
      where category_type = v_current.category_type
        and parent_id is not distinct from v_current.parent_id
        and id <> v_current.id
        and home_sort_order > v_current.home_sort_order
      order by home_sort_order asc, name asc, id asc
      limit 1
      for update;
  end if;

  if not found then
    return false;
  end if;

  update public.categories
  set home_sort_order = case
    when id = v_current.id then v_neighbor.home_sort_order
    when id = v_neighbor.id then v_current.home_sort_order
  end
  where id in (v_current.id, v_neighbor.id);

  return true;
end;
$$;

revoke all on function public.admin_move_home_category(uuid, text) from public;
revoke all on function public.admin_move_home_category(uuid, text) from anon;
grant execute on function public.admin_move_home_category(uuid, text) to authenticated;

commit;
