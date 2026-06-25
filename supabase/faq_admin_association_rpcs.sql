-- Atomic FAQ association replacements for admin saves.
-- Run after faq_management.sql.
-- Safe to re-run. Does not seed example FAQ content.

begin;

create or replace function public.replace_product_faq_associations(
  p_product_id uuid,
  p_group_ids uuid[],
  p_item_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_group_count integer;
  v_item_count integer;
begin
  perform public.assert_admin();

  if not exists (
    select 1
    from public.products
    where id = p_product_id
  ) then
    raise exception 'product_not_found' using errcode = 'P0002';
  end if;

  if coalesce(cardinality(p_group_ids), 0) > 0 then
    if cardinality(p_group_ids) <> (
      select count(distinct group_id)
      from unnest(p_group_ids) as selected(group_id)
    ) then
      raise exception 'duplicate_product_faq_group' using errcode = '22023';
    end if;

    select count(*)
    into v_group_count
    from public.faq_groups g
    where g.id = any(p_group_ids)
      and g.is_active = true
      and g.scope = 'product';

    if v_group_count <> cardinality(p_group_ids) then
      raise exception 'invalid_product_faq_group' using errcode = '22023';
    end if;
  end if;

  if coalesce(cardinality(p_item_ids), 0) > 0 then
    if cardinality(p_item_ids) <> (
      select count(distinct faq_item_id)
      from unnest(p_item_ids) as selected(faq_item_id)
    ) then
      raise exception 'duplicate_product_faq_item' using errcode = '22023';
    end if;

    select count(*)
    into v_item_count
    from public.faq_items i
    where i.id = any(p_item_ids);

    if v_item_count <> cardinality(p_item_ids) then
      raise exception 'invalid_faq_item' using errcode = '22023';
    end if;
  end if;

  delete from public.product_faq_groups
  where product_id = p_product_id;

  delete from public.product_faq_items
  where product_id = p_product_id;

  if coalesce(cardinality(p_group_ids), 0) > 0 then
    insert into public.product_faq_groups (product_id, group_id, sort_order)
    select
      p_product_id,
      selected.group_id,
      (selected.ordinality - 1) * 10
    from unnest(p_group_ids) with ordinality as selected(group_id, ordinality);
  end if;

  if coalesce(cardinality(p_item_ids), 0) > 0 then
    insert into public.product_faq_items (product_id, faq_item_id, sort_order)
    select
      p_product_id,
      selected.faq_item_id,
      (selected.ordinality - 1) * 10
    from unnest(p_item_ids) with ordinality as selected(faq_item_id, ordinality);
  end if;
end;
$$;

create or replace function public.replace_faq_group_items(
  p_group_id uuid,
  p_item_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_item_count integer;
begin
  perform public.assert_admin();

  if not exists (
    select 1
    from public.faq_groups
    where id = p_group_id
  ) then
    raise exception 'invalid_faq_group' using errcode = 'P0002';
  end if;

  if coalesce(cardinality(p_item_ids), 0) > 0 then
    if cardinality(p_item_ids) <> (
      select count(distinct faq_item_id)
      from unnest(p_item_ids) as selected(faq_item_id)
    ) then
      raise exception 'duplicate_faq_group_item' using errcode = '22023';
    end if;

    select count(*)
    into v_item_count
    from public.faq_items i
    where i.id = any(p_item_ids);

    if v_item_count <> cardinality(p_item_ids) then
      raise exception 'invalid_faq_item' using errcode = '22023';
    end if;
  end if;

  delete from public.faq_group_items
  where group_id = p_group_id;

  if coalesce(cardinality(p_item_ids), 0) > 0 then
    insert into public.faq_group_items (group_id, faq_item_id, sort_order)
    select
      p_group_id,
      selected.faq_item_id,
      (selected.ordinality - 1) * 10
    from unnest(p_item_ids) with ordinality as selected(faq_item_id, ordinality);
  end if;
end;
$$;

revoke all on function public.replace_product_faq_associations(uuid, uuid[], uuid[]) from public;
revoke all on function public.replace_faq_group_items(uuid, uuid[]) from public;

grant execute on function public.replace_product_faq_associations(uuid, uuid[], uuid[]) to authenticated;
grant execute on function public.replace_faq_group_items(uuid, uuid[]) to authenticated;

commit;
