-- Home-page featured products and manually configured related products.
-- Safe to run after products_table.sql and admin_auth.sql.

create table if not exists public.home_featured_products (
  product_id uuid primary key references public.products (id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists home_featured_products_sort_idx
  on public.home_featured_products (sort_order, created_at);

create table if not exists public.related_products (
  product_id uuid not null references public.products (id) on delete cascade,
  related_product_id uuid not null references public.products (id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (product_id, related_product_id),
  constraint related_products_not_self check (product_id <> related_product_id)
);

create index if not exists related_products_product_sort_idx
  on public.related_products (product_id, sort_order);

alter table public.home_featured_products enable row level security;
alter table public.related_products enable row level security;

grant select on public.home_featured_products to anon, authenticated;
grant select on public.related_products to anon, authenticated;
grant insert, update, delete on public.home_featured_products to authenticated;
grant insert, update, delete on public.related_products to authenticated;

drop policy if exists "home_featured_products_public_read"
  on public.home_featured_products;
create policy "home_featured_products_public_read"
on public.home_featured_products
for select
to anon, authenticated
using (true);

drop policy if exists "home_featured_products_admin_write"
  on public.home_featured_products;
create policy "home_featured_products_admin_write"
on public.home_featured_products
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "related_products_public_read"
  on public.related_products;
create policy "related_products_public_read"
on public.related_products
for select
to anon, authenticated
using (true);

drop policy if exists "related_products_admin_write"
  on public.related_products;
create policy "related_products_admin_write"
on public.related_products
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create or replace function public.admin_replace_product_merchandising(
  p_product_id uuid,
  p_is_featured boolean,
  p_home_sort_order integer,
  p_related_product_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_related_count integer;
begin
  perform public.assert_admin();

  if not exists (select 1 from public.products where id = p_product_id) then
    raise exception 'product_not_found' using errcode = 'P0002';
  end if;

  if coalesce(p_is_featured, false) then
    insert into public.home_featured_products (product_id, sort_order, updated_at)
    values (p_product_id, greatest(coalesce(p_home_sort_order, 0), 0), now())
    on conflict (product_id) do update
    set
      sort_order = excluded.sort_order,
      updated_at = now();
  else
    delete from public.home_featured_products where product_id = p_product_id;
  end if;

  select count(*)
  into v_related_count
  from public.products
  where id = any(coalesce(p_related_product_ids, array[]::uuid[]));

  if v_related_count <> (
    select count(distinct related_id)
    from unnest(coalesce(p_related_product_ids, array[]::uuid[]))
      as related(related_id)
    where related_id <> p_product_id
  ) then
    raise exception 'invalid_related_product' using errcode = '22023';
  end if;

  delete from public.related_products where product_id = p_product_id;

  insert into public.related_products (
    product_id,
    related_product_id,
    sort_order
  )
  select
    p_product_id,
    selected.related_id,
    selected.ordinality - 1
  from unnest(coalesce(p_related_product_ids, array[]::uuid[]))
    with ordinality as selected(related_id, ordinality)
  where selected.related_id <> p_product_id
  on conflict (product_id, related_product_id) do update
  set sort_order = excluded.sort_order;
end;
$$;

revoke all on function public.admin_replace_product_merchandising(
  uuid, boolean, integer, uuid[]
) from public;
grant execute on function public.admin_replace_product_merchandising(
  uuid, boolean, integer, uuid[]
) to authenticated;

-- Give a new installation a useful home page immediately. The selection can
-- then be changed from each product's merchandising settings in the admin.
insert into public.home_featured_products (product_id, sort_order)
select id, (row_number() over (order by created_at desc) - 1) * 10
from public.products
order by created_at desc
limit 6
on conflict (product_id) do nothing;
