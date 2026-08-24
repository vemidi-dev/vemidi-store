-- Hotfix: admin_replace_home_featured_order fails under pg-safeupdate with
-- "DELETE requires a WHERE clause" (SQLSTATE 21000).
-- Safe to re-run. Does not change catalog RPC.

create or replace function public.admin_replace_home_featured_order(
  p_product_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform public.assert_admin();

  -- pg-safeupdate rejects DELETE without a WHERE clause.
  delete from public.home_featured_products
  where product_id is not null;

  if coalesce(array_length(p_product_ids, 1), 0) = 0 then
    return;
  end if;

  if (
    select count(*)
    from public.products
    where id = any(p_product_ids)
  ) <> (
    select count(distinct entry)
    from unnest(p_product_ids) as entry
  ) then
    raise exception 'invalid_product' using errcode = '22023';
  end if;

  insert into public.home_featured_products (product_id, sort_order, updated_at)
  select
    selected.product_id,
    selected.ordinality * 10,
    now()
  from unnest(p_product_ids) with ordinality as selected(product_id, ordinality)
  on conflict (product_id) do update
  set
    sort_order = excluded.sort_order,
    updated_at = now();
end;
$$;

revoke all on function public.admin_replace_home_featured_order(uuid[]) from public;
grant execute on function public.admin_replace_home_featured_order(uuid[]) to authenticated;
