-- Manual catalog sort order for /produkti default listing.
-- Safe to run after products_table.sql and admin_auth.sql.

alter table public.products
  add column if not exists catalog_sort_order integer not null default 0;

create index if not exists products_catalog_sort_order_idx
  on public.products (catalog_sort_order, created_at desc);

with ranked as (
  select
    id,
    row_number() over (order by created_at desc, id desc) * 10 as position
  from public.products
)
update public.products as product
set catalog_sort_order = ranked.position
from ranked
where product.id = ranked.id
  and product.catalog_sort_order = 0;

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

  delete from public.home_featured_products;

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

create or replace function public.admin_replace_catalog_sort_order(
  p_product_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform public.assert_admin();

  if coalesce(array_length(p_product_ids, 1), 0) = 0 then
    raise exception 'invalid_product' using errcode = '22023';
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

  update public.products as product
  set catalog_sort_order = ranked.position
  from (
    select
      selected.product_id,
      selected.ordinality * 10 as position
    from unnest(p_product_ids) with ordinality as selected(product_id, ordinality)
  ) as ranked
  where product.id = ranked.product_id;
end;
$$;

revoke all on function public.admin_replace_home_featured_order(uuid[]) from public;
grant execute on function public.admin_replace_home_featured_order(uuid[]) to authenticated;

revoke all on function public.admin_replace_catalog_sort_order(uuid[]) from public;
grant execute on function public.admin_replace_catalog_sort_order(uuid[]) to authenticated;
