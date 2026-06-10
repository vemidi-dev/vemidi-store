-- Allow administrators to create arbitrary reusable color palettes.

alter table public.color_groups
  drop constraint if exists color_groups_key_check;

alter table public.color_groups
  add constraint color_groups_key_check
  check (key ~ '^[a-z0-9][a-z0-9_-]{2,63}$');

create or replace function public.admin_move_color_option(
  p_option_id uuid,
  p_direction text
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_current public.color_options%rowtype;
  v_neighbor public.color_options%rowtype;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if p_direction not in ('up', 'down') then
    raise exception 'invalid_direction' using errcode = '22023';
  end if;

  select *
    into v_current
    from public.color_options
    where id = p_option_id
    for update;

  if not found then
    raise exception 'color_option_not_found' using errcode = 'P0002';
  end if;

  if p_direction = 'up' then
    select *
      into v_neighbor
      from public.color_options
      where group_id = v_current.group_id
        and id <> v_current.id
        and sort_order < v_current.sort_order
      order by sort_order desc, name desc, id desc
      limit 1
      for update;
  else
    select *
      into v_neighbor
      from public.color_options
      where group_id = v_current.group_id
        and id <> v_current.id
        and sort_order > v_current.sort_order
      order by sort_order asc, name asc, id asc
      limit 1
      for update;
  end if;

  if not found then
    return false;
  end if;

  update public.color_options
  set sort_order = case
    when id = v_current.id then v_neighbor.sort_order
    when id = v_neighbor.id then v_current.sort_order
  end
  where id in (v_current.id, v_neighbor.id);

  return true;
end;
$$;

revoke all on function public.admin_move_color_option(uuid, text) from public;
grant execute on function public.admin_move_color_option(uuid, text) to authenticated;
