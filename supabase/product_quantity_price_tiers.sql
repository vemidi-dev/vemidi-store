-- Quantity-based unit prices for stocked/material products.
-- Run manually before deploying app code that selects products.quantity_price_tiers.

alter table public.products
  add column if not exists quantity_price_tiers jsonb not null default '[]'::jsonb;

comment on column public.products.quantity_price_tiers is
  'JSON array of quantity price tiers: [{minQuantity,maxQuantity,unitPrice}]. maxQuantity null means no upper limit.';

create or replace function public.resolve_product_quantity_unit_price(
  p_product_id uuid,
  p_quantity integer,
  p_at timestamptz default now()
)
returns numeric(10, 2)
language plpgsql
stable
set search_path = ''
as $$
declare
  v_base_price numeric(10, 2);
  v_tiers jsonb;
  v_tier jsonb;
  v_quantity integer := greatest(1, coalesce(p_quantity, 1));
  v_tier_price numeric(10, 2) := null;
begin
  select price, quantity_price_tiers
    into v_base_price, v_tiers
    from public.products
    where id = p_product_id;

  if not found or v_base_price is null then
    raise exception 'product_not_found' using errcode = 'P0002';
  end if;

  for v_tier in
    select value
    from jsonb_array_elements(coalesce(v_tiers, '[]'::jsonb))
  loop
    if v_quantity >= greatest(1, coalesce((v_tier ->> 'minQuantity')::integer, 1))
      and (
        v_tier ->> 'maxQuantity' is null
        or v_quantity <= (v_tier ->> 'maxQuantity')::integer
      )
      and coalesce((v_tier ->> 'unitPrice')::numeric, -1) >= 0
    then
      v_tier_price := round((v_tier ->> 'unitPrice')::numeric, 2);
      exit;
    end if;
  end loop;

  return coalesce(v_tier_price, public.resolve_product_unit_price(p_product_id, p_at));
end;
$$;

revoke all on function public.resolve_product_quantity_unit_price(uuid, integer, timestamptz) from public;
grant execute on function public.resolve_product_quantity_unit_price(uuid, integer, timestamptz)
  to anon, authenticated, service_role;

-- Important:
-- Run product_quantity_price_tiers_checkout.sql after this file so checkout
-- applies the same tier prices when an order is created.
