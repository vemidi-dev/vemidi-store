-- Checkout support for quantity-based product prices.
-- Run manually after product_quantity_price_tiers.sql.

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
  v_base_price numeric(10, 2);
  v_tiers jsonb;
  v_tier jsonb;
  v_tier_price numeric(10, 2) := null;
  v_order_quantity integer := null;
  v_promo public.product_promotions%rowtype;
  v_effective numeric(10, 2);
begin
  select price, quantity_price_tiers
    into v_base_price, v_tiers
    from public.products
    where id = p_product_id;

  if not found or v_base_price is null then
    raise exception 'product_not_found' using errcode = 'P0002';
  end if;

  if to_regclass('pg_temp._order_demand') is not null then
    execute 'select quantity from pg_temp._order_demand where product_id = $1'
      into v_order_quantity
      using p_product_id;
  end if;

  if coalesce(v_order_quantity, 0) > 0 then
    for v_tier in
      select value
      from jsonb_array_elements(coalesce(v_tiers, '[]'::jsonb))
    loop
      if v_order_quantity >= greatest(1, coalesce((v_tier ->> 'minQuantity')::integer, 1))
        and (
          v_tier ->> 'maxQuantity' is null
          or v_order_quantity <= (v_tier ->> 'maxQuantity')::integer
        )
        and coalesce((v_tier ->> 'unitPrice')::numeric, -1) >= 0
      then
        v_tier_price := round((v_tier ->> 'unitPrice')::numeric, 2);
        exit;
      end if;
    end loop;

    if v_tier_price is not null then
      return v_tier_price;
    end if;
  end if;

  select *
    into v_promo
    from public.product_promotions
    where product_id = p_product_id
      and is_active = true
      and starts_at <= p_at
      and ends_at > p_at
    order by created_at desc
    limit 1;

  if not found then
    return v_base_price;
  end if;

  if v_promo.discount_type = 'percentage' then
    v_effective := round(v_base_price * (1 - v_promo.discount_value / 100.0), 2);
  else
    v_effective := round(v_promo.discount_value, 2);
  end if;

  v_effective := greatest(v_effective, 0);

  if v_effective >= v_base_price then
    return v_base_price;
  end if;

  return v_effective;
end;
$$;

revoke all on function public.resolve_product_unit_price(uuid, timestamptz) from public;
grant execute on function public.resolve_product_unit_price(uuid, timestamptz)
  to anon, authenticated, service_role;
