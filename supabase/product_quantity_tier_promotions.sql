-- Run manually in Supabase SQL Editor after product_quantity_price_tiers_checkout.sql.
-- Promotions apply AFTER choosing the quantity tier, exactly once, before option
-- and personalization surcharges. Does not modify products, campaigns or orders.
begin;

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
  v_promo public.product_promotions%rowtype;
  v_effective numeric(10, 2);
begin
  select price, quantity_price_tiers into v_base_price, v_tiers
  from public.products where id = p_product_id;
  if not found or v_base_price is null then
    raise exception 'product_not_found' using errcode = 'P0002';
  end if;

  for v_tier in
    select value from jsonb_array_elements(coalesce(v_tiers, '[]'::jsonb))
    order by (value ->> 'minQuantity')::integer
  loop
    if v_quantity >= greatest(1, coalesce((v_tier ->> 'minQuantity')::integer, 1))
      and (v_tier ->> 'maxQuantity' is null
        or v_quantity <= (v_tier ->> 'maxQuantity')::integer)
      and coalesce((v_tier ->> 'unitPrice')::numeric, -1) >= 0
    then
      v_base_price := round((v_tier ->> 'unitPrice')::numeric, 2);
      exit;
    end if;
  end loop;

  select * into v_promo from public.product_promotions
  where product_id = p_product_id and is_active = true
    and starts_at <= p_at and ends_at > p_at
  order by created_at desc limit 1;
  if not found then
    return v_base_price;
  end if;
  if v_promo.discount_type = 'percentage' then
    v_effective := round(v_base_price * (1 - v_promo.discount_value / 100.0), 2);
  else
    v_effective := round(v_promo.discount_value, 2);
  end if;
  return least(v_base_price, greatest(0, v_effective));
end;
$$;

create or replace function public.resolve_product_unit_price(
  p_product_id uuid,
  p_at timestamptz default now()
)
returns numeric(10, 2)
language plpgsql
stable
set search_path = ''
as $$
declare
  v_order_quantity integer := 1;
begin
  -- Keep the existing checkout quantity context and inventory demand handling.
  if to_regclass('pg_temp._order_demand') is not null then
    execute 'select quantity from pg_temp._order_demand where product_id = $1'
      into v_order_quantity using p_product_id;
  end if;
  return public.resolve_product_quantity_unit_price(p_product_id, v_order_quantity, p_at);
end;
$$;

revoke all on function public.resolve_product_quantity_unit_price(uuid, integer, timestamptz) from public;
grant execute on function public.resolve_product_quantity_unit_price(uuid, integer, timestamptz)
  to anon, authenticated, service_role;
revoke all on function public.resolve_product_unit_price(uuid, timestamptz) from public;
grant execute on function public.resolve_product_unit_price(uuid, timestamptz)
  to anon, authenticated, service_role;

commit;
