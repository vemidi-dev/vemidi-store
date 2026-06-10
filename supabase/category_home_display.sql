-- Manage which categories appear on the home page and their display order.
-- Existing categories remain visible and receive a stable initial position.

alter table public.categories
  add column if not exists show_on_home boolean not null default true,
  add column if not exists home_sort_order integer not null default 0;

with ranked as (
  select
    id,
    row_number() over (
      partition by category_type
      order by name, id
    ) * 10 as position
  from public.categories
)
update public.categories as categories
set home_sort_order = ranked.position
from ranked
where categories.id = ranked.id
  and categories.home_sort_order = 0;

create index if not exists categories_home_display_idx
  on public.categories (category_type, show_on_home, home_sort_order, name);

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
