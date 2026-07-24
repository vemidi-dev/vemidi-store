-- Adds a third category type for supplies/materials.
-- Run manually in Supabase before testing the admin/storefront changes.

begin;

alter table public.categories
  drop constraint if exists categories_type_check;

alter table public.categories
  add constraint categories_type_check
  check (category_type in ('product', 'occasion', 'material'));

create index if not exists categories_type_parent_order_idx
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
  ) and (new.parent_id is not null or new.category_type not in ('product', 'material')) then
    raise exception 'category_with_children_must_remain_top_level_category'
      using errcode = '23514';
  end if;

  if new.parent_id is null then
    return new;
  end if;

  if new.category_type not in ('product', 'material') then
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

  if v_parent.category_type <> new.category_type then
    raise exception 'category_parent_must_match_category_type'
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

commit;
