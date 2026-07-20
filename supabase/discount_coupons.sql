-- Discount coupons (one-time percentage codes) + create_store_order coupon support.
-- Run AFTER product_upsell_checkout.sql (latest create_store_order baseline).
-- Safe to re-run. Do not run automatically — apply manually in Supabase.

begin;

create table if not exists public.discount_coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  discount_percentage numeric(5,2) not null,
  is_active boolean not null default true,
  used_at timestamptz null,
  used_order_id uuid null references public.orders (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint discount_coupons_code_unique unique (code),
  constraint discount_coupons_code_format
    check (code ~ '^[A-Z0-9]{4,32}$'),
  constraint discount_coupons_percentage_range
    check (discount_percentage > 0 and discount_percentage <= 100)
);

create index if not exists discount_coupons_active_unused_idx
  on public.discount_coupons (is_active, used_at)
  where used_at is null;

drop trigger if exists discount_coupons_set_updated_at on public.discount_coupons;
create trigger discount_coupons_set_updated_at
before update on public.discount_coupons
for each row
execute function public.set_updated_at();

alter table public.discount_coupons enable row level security;

revoke all on public.discount_coupons from public;
revoke all on public.discount_coupons from anon;
grant select, insert, update, delete on public.discount_coupons to authenticated;
grant all on public.discount_coupons to service_role;

drop policy if exists "discount_coupons_admin_all" on public.discount_coupons;
create policy "discount_coupons_admin_all"
on public.discount_coupons
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

commit;

-- ---------------------------------------------------------------------------
-- create_store_order: add optional p_coupon_code (replaces previous overload)
-- ---------------------------------------------------------------------------

drop function if exists public.create_store_order(jsonb, jsonb, jsonb, text, uuid, jsonb);
drop function if exists public.create_store_order(jsonb, jsonb, jsonb, text, uuid, jsonb, text);

create or replace function public.create_store_order(
  p_customer jsonb,
  p_delivery jsonb,
  p_items jsonb,
  p_note text,
  p_idempotency_key uuid,
  p_attribution jsonb default null,
  p_coupon_code text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_product record;
  v_field record;
  v_color record;
  v_color_input jsonb;
  v_product_id uuid;
  v_field_id uuid;
  v_option_id uuid;
  v_quantity integer;
  v_selected_count integer;
  v_personalization text;
  v_items jsonb := '[]'::jsonb;
  v_colors jsonb;
  v_product_names text[] := array[]::text[];
  v_total numeric(10, 2) := 0;
  v_base_unit_price numeric(10, 2);
  v_unit_price numeric(10, 2);
  v_promotion_snapshot jsonb;
  v_option_result jsonb;
  v_option_delta numeric(10, 2);
  v_effective_base numeric(10, 2);
  v_order_id uuid;
  v_request_reserved boolean := false;
  v_customer_name text := trim(coalesce(p_customer ->> 'name', ''));
  v_customer_phone text := regexp_replace(coalesce(p_customer ->> 'phone', ''), '\s+', '', 'g');
  v_customer_email text := nullif(trim(coalesce(p_customer ->> 'email', '')), '');
  v_courier text := p_delivery ->> 'courier';
  v_delivery_type text := p_delivery ->> 'type';
  v_city text := trim(coalesce(p_delivery ->> 'city', ''));
  v_office_or_postcode text := trim(coalesce(p_delivery ->> 'officeOrPostcode', ''));
  v_delivery_details text := trim(coalesce(p_delivery ->> 'details', ''));
  v_order_source text := coalesce(nullif(trim(p_attribution ->> 'source'), ''), 'vemidi-store');
  v_order_campaign text := nullif(left(trim(coalesce(p_attribution ->> 'campaign', '')), 64), '');
  v_order_landing_url text := nullif(left(trim(coalesce(p_attribution ->> 'landingUrl', '')), 240), '');
  v_demand record;
  v_stock_before integer;
  v_stock_after integer;
  v_stock_snapshots jsonb := '{}'::jsonb;
  v_upsell jsonb;
  v_upsell_offer record;
  v_upsell_source_product_id uuid;
  v_upsell_offer_id uuid;
  v_upsell_snapshot jsonb;
  v_subtotal numeric(10, 2) := 0;
  v_discount_amount numeric(10, 2) := 0;
  v_discount_percentage numeric(5, 2) := null;
  v_coupon_code text := null;
  v_coupon_id uuid := null;
  v_coupon record;
begin
  if p_idempotency_key is null then
    raise exception 'invalid_idempotency_key' using errcode = '22023';
  end if;

  insert into public.store_order_requests (idempotency_key)
  values (p_idempotency_key)
  on conflict (idempotency_key) do nothing
  returning true into v_request_reserved;

  if not coalesce(v_request_reserved, false) then
    select order_id
      into v_order_id
      from public.store_order_requests
      where idempotency_key = p_idempotency_key;

    if v_order_id is not null then
      return v_order_id;
    end if;

    raise exception 'order_request_in_progress' using errcode = '40001';
  end if;

  if char_length(v_customer_name) < 2 or char_length(v_customer_name) > 120 then
    raise exception 'invalid_customer_name' using errcode = '22023';
  end if;

  if char_length(v_customer_phone) < 6 or char_length(v_customer_phone) > 30 then
    raise exception 'invalid_customer_phone' using errcode = '22023';
  end if;

  if v_customer_email is not null
    and (char_length(v_customer_email) > 160 or v_customer_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') then
    raise exception 'invalid_customer_email' using errcode = '22023';
  end if;

  if v_courier not in ('econt', 'speedy') then
    raise exception 'invalid_courier' using errcode = '22023';
  end if;

  if v_delivery_type not in ('office', 'address') then
    raise exception 'invalid_delivery_type' using errcode = '22023';
  end if;

  if char_length(v_city) < 2 or char_length(v_city) > 120 then
    raise exception 'invalid_city' using errcode = '22023';
  end if;

  if v_delivery_type = 'office' and char_length(v_office_or_postcode) < 2 then
    raise exception 'office_required' using errcode = '22023';
  end if;

  if v_delivery_type = 'address' and char_length(v_delivery_details) < 5 then
    raise exception 'address_required' using errcode = '22023';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'empty_order' using errcode = '22023';
  end if;

  if jsonb_array_length(p_items) > 50 then
    raise exception 'too_many_items' using errcode = '22023';
  end if;

  create temporary table _order_demand (
    product_id uuid primary key,
    quantity integer not null check (quantity > 0)
  ) on commit drop;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    begin
      v_product_id := (v_item ->> 'productId')::uuid;
      v_quantity := (v_item ->> 'quantity')::integer;
    exception
      when others then
        raise exception 'invalid_order_item' using errcode = '22023';
    end;

    if v_quantity < 1 or v_quantity > 99 then
      raise exception 'invalid_quantity' using errcode = '22023';
    end if;

    insert into _order_demand (product_id, quantity)
    values (v_product_id, v_quantity)
    on conflict (product_id)
    do update set quantity = _order_demand.quantity + excluded.quantity;
  end loop;

  for v_demand in
    select d.product_id, d.quantity
    from _order_demand d
    join public.products p on p.id = d.product_id
    where p.fulfillment_type = 'stocked'
    order by d.product_id
  loop
    select stock_quantity
      into v_stock_before
      from public.products
      where id = v_demand.product_id
      for update;

    if v_stock_before is null or v_stock_before < v_demand.quantity then
      raise exception 'insufficient_stock' using errcode = '22023';
    end if;

    v_stock_after := v_stock_before - v_demand.quantity;
    v_stock_snapshots := v_stock_snapshots || jsonb_build_object(
      v_demand.product_id::text,
      jsonb_build_object(
        'stockQuantityBefore', v_stock_before,
        'stockQuantityAfter', v_stock_after
      )
    );
  end loop;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    begin
      v_product_id := (v_item ->> 'productId')::uuid;
      v_quantity := (v_item ->> 'quantity')::integer;
    exception
      when others then
        raise exception 'invalid_order_item' using errcode = '22023';
    end;

    select
      id,
      name,
      price,
      is_customizable,
      is_sold_out,
      slug,
      product_code,
      fulfillment_type,
      stock_quantity,
      status,
      visibility
      into v_product
      from public.products
      where id = v_product_id;

    if not found then
      raise exception 'product_not_found' using errcode = 'P0002';
    end if;

    if coalesce(v_product.status, 'draft') <> 'published' then
      raise exception 'product_not_found' using errcode = 'P0002';
    end if;

    if coalesce(v_product.visibility, 'public') = 'upsell_only'
      and not (v_item ? 'upsell') then
      raise exception 'upsell_only_product_requires_offer' using errcode = '22023';
    end if;

    if coalesce(v_product.is_sold_out, false) then
      raise exception 'product_sold_out' using errcode = '22023';
    end if;

    if v_product.fulfillment_type = 'unavailable' then
      raise exception 'product_unavailable' using errcode = '22023';
    end if;

    if v_product.fulfillment_type = 'stocked'
      and coalesce(v_product.stock_quantity, 0) <= 0 then
      raise exception 'product_sold_out' using errcode = '22023';
    end if;

    if v_product.price is null or v_product.price < 0 then
      raise exception 'invalid_product_price' using errcode = '22023';
    end if;

    v_base_unit_price := v_product.price;

    v_option_result := public.validate_product_option_selections(
      v_product_id,
      coalesce(v_item -> 'optionSelections', '[]'::jsonb)
    );

    v_effective_base := (v_option_result ->> 'effectiveBasePrice')::numeric;
    v_option_delta := (v_option_result ->> 'optionDelta')::numeric;
    v_unit_price := (v_option_result ->> 'unitPrice')::numeric;
    v_promotion_snapshot := v_option_result -> 'promotion';
    v_upsell_snapshot := null;

    if v_item ? 'upsell' and v_item -> 'upsell' <> 'null'::jsonb then
      v_upsell := v_item -> 'upsell';
      if jsonb_typeof(v_upsell) <> 'object' then
        raise exception 'invalid_upsell_offer' using errcode = '22023';
      end if;

      begin
        v_upsell_offer_id := (v_upsell ->> 'offerId')::uuid;
        v_upsell_source_product_id := (v_upsell ->> 'sourceProductId')::uuid;
      exception
        when others then
          raise exception 'invalid_upsell_offer' using errcode = '22023';
      end;

      select
        offer.id,
        offer.source_product_id,
        offer.upsell_product_id,
        offer.offer_title,
        offer.offer_description,
        offer.special_price,
        offer.suggested_quantity,
        offer.max_quantity
        into v_upsell_offer
        from public.product_upsell_offers offer
        where offer.id = v_upsell_offer_id
          and offer.source_product_id = v_upsell_source_product_id
          and offer.upsell_product_id = v_product_id
          and offer.is_active = true
          and exists (
            select 1
            from _order_demand demand
            where demand.product_id = offer.source_product_id
          );

      if not found then
        raise exception 'invalid_upsell_offer' using errcode = '22023';
      end if;

      if v_quantity > coalesce(v_upsell_offer.max_quantity, 1) then
        raise exception 'invalid_upsell_quantity' using errcode = '22023';
      end if;

      if v_upsell_offer.special_price is null or v_upsell_offer.special_price < 0 then
        raise exception 'invalid_upsell_price' using errcode = '22023';
      end if;

      v_effective_base := v_upsell_offer.special_price;
      v_unit_price := greatest(0, v_upsell_offer.special_price + v_option_delta);
      v_upsell_snapshot := jsonb_build_object(
        'offerId', v_upsell_offer.id,
        'sourceProductId', v_upsell_offer.source_product_id,
        'specialPrice', v_upsell_offer.special_price,
        'originalBasePrice', v_base_unit_price,
        'maxQuantity', v_upsell_offer.max_quantity,
        'title', v_upsell_offer.offer_title,
        'description', v_upsell_offer.offer_description
      );
    end if;

    v_personalization := nullif(trim(coalesce(v_item ->> 'personalization', '')), '');
    if char_length(coalesce(v_personalization, '')) > 1000 then
      raise exception 'personalization_too_long' using errcode = '22023';
    end if;

    if not v_product.is_customizable and v_personalization is not null then
      raise exception 'product_not_customizable' using errcode = '22023';
    end if;

    if v_item ? 'selectedColors' and jsonb_typeof(v_item -> 'selectedColors') <> 'array' then
      raise exception 'invalid_color_selection' using errcode = '22023';
    end if;

    for v_field in
      select id, min_select, max_select
      from public.product_color_fields
      where product_id = v_product_id and enabled = true
    loop
      select count(distinct selected ->> 'optionId')
        into v_selected_count
        from jsonb_array_elements(coalesce(v_item -> 'selectedColors', '[]'::jsonb))
          as choices(selected)
        where selected ->> 'fieldId' = v_field.id::text;

      if v_selected_count < v_field.min_select or v_selected_count > v_field.max_select then
        raise exception 'invalid_color_count' using errcode = '22023';
      end if;
    end loop;

    v_colors := '[]'::jsonb;
    for v_color_input in
      select selected
      from jsonb_array_elements(coalesce(v_item -> 'selectedColors', '[]'::jsonb))
        as choices(selected)
    loop
      begin
        v_field_id := (v_color_input ->> 'fieldId')::uuid;
        v_option_id := (v_color_input ->> 'optionId')::uuid;
      exception
        when others then
          raise exception 'invalid_color_selection' using errcode = '22023';
      end;

      select
        field.label as field_label,
        color_group.id as group_id,
        color_group.key as group_key,
        color_group.label as group_label,
        color_option.id as option_id,
        color_option.name as option_name,
        color_option.hex as option_hex
      into v_color
      from public.product_color_fields field
      join public.product_color_field_options allowed
        on allowed.field_id = field.id
      join public.color_options color_option
        on color_option.id = allowed.color_option_id
       and color_option.is_active = true
      join public.color_groups color_group
        on color_group.id = field.group_id
       and color_group.id = color_option.group_id
      where field.id = v_field_id
        and field.product_id = v_product_id
        and field.enabled = true
        and color_option.id = v_option_id;

      if not found then
        raise exception 'invalid_color_selection' using errcode = '22023';
      end if;

      v_colors := v_colors || jsonb_build_array(
        jsonb_build_object(
          'fieldId', v_field_id,
          'fieldLabel', v_color.field_label,
          'groupId', v_color.group_id,
          'groupKey', v_color.group_key,
          'groupLabel', v_color.group_label,
          'optionId', v_color.option_id,
          'optionName', v_color.option_name,
          'optionHex', v_color.option_hex
        )
      );
    end loop;

    v_stock_before := null;
    v_stock_after := null;
    if v_product.fulfillment_type = 'stocked' then
      v_stock_before := (v_stock_snapshots -> v_product.id::text ->> 'stockQuantityBefore')::integer;
      v_stock_after := (v_stock_snapshots -> v_product.id::text ->> 'stockQuantityAfter')::integer;
    end if;

    v_total := v_total + (v_unit_price * v_quantity);
    v_product_names := array_append(v_product_names, v_product.name);
    v_items := v_items || jsonb_build_array(
      jsonb_build_object(
        'productId', v_product.id,
        'productCode', v_product.product_code,
        'productSlug', v_product.slug,
        'name', v_product.name,
        'fulfillmentType', v_product.fulfillment_type,
        'stockQuantityBefore', v_stock_before,
        'stockQuantityAfter', v_stock_after,
        'baseUnitPrice', v_base_unit_price,
        'effectiveBasePrice', v_effective_base,
        'optionDelta', v_option_delta,
        'unitPrice', v_unit_price,
        'promotion', v_promotion_snapshot,
        'upsell', v_upsell_snapshot,
        'quantity', v_quantity,
        'lineTotal', v_unit_price * v_quantity,
        'personalization', v_personalization,
        'personalizationFields', coalesce(v_item -> 'personalizationFields', '[]'::jsonb),
        'selectedColors', v_colors,
        'optionSelections', v_option_result -> 'optionSelections'
      )
    );
  end loop;

  update public.products product
  set stock_quantity = product.stock_quantity - demand.quantity
  from _order_demand demand
  where product.id = demand.product_id
    and product.fulfillment_type = 'stocked';

  v_subtotal := v_total;
  v_discount_amount := 0;
  v_discount_percentage := null;
  v_coupon_code := null;
  v_coupon_id := null;

  if nullif(trim(coalesce(p_coupon_code, '')), '') is not null then
    v_coupon_code := upper(trim(p_coupon_code));

    if v_coupon_code !~ '^[A-Z0-9]{4,32}$' then
      raise exception 'coupon_invalid' using errcode = '22023';
    end if;

    select
      id,
      code,
      discount_percentage,
      is_active,
      used_at,
      used_order_id
      into v_coupon
      from public.discount_coupons
      where code = v_coupon_code
      for update;

    if not found then
      raise exception 'coupon_invalid' using errcode = '22023';
    end if;

    if not coalesce(v_coupon.is_active, false) then
      raise exception 'coupon_inactive' using errcode = '22023';
    end if;

    if v_coupon.used_at is not null or v_coupon.used_order_id is not null then
      raise exception 'coupon_used' using errcode = '22023';
    end if;

    v_coupon_id := v_coupon.id;
    v_coupon_code := v_coupon.code;
    v_discount_percentage := v_coupon.discount_percentage;
    v_discount_amount := round(v_subtotal * v_discount_percentage / 100.0, 2);
    v_total := greatest(0, v_subtotal - v_discount_amount);
  end if;

  insert into public.orders (
    status,
    product_name,
    total_price,
    currency,
    customer_name,
    customer_phone,
    customer_email,
    courier,
    delivery_type,
    city,
    delivery_details,
    office_name,
    payment_method,
    note,
    raw_payload
  )
  values (
    'new',
    array_to_string(v_product_names, ', '),
    v_total,
    'EUR',
    v_customer_name,
    v_customer_phone,
    v_customer_email,
    v_courier,
    v_delivery_type,
    v_city,
    case
      when v_delivery_type = 'address' then v_delivery_details
      else nullif(v_office_or_postcode, '')
    end,
    case
      when v_delivery_type = 'office' then nullif(v_office_or_postcode, '')
      else null
    end,
    'cash_on_delivery',
    nullif(left(trim(coalesce(p_note, '')), 1000), ''),
    jsonb_build_object(
      'source', v_order_source,
      'campaign', v_order_campaign,
      'landingUrl', v_order_landing_url,
      'customer', jsonb_build_object(
        'name', v_customer_name,
        'phone', v_customer_phone,
        'email', v_customer_email
      ),
      'delivery', jsonb_build_object(
        'courier', v_courier,
        'type', v_delivery_type,
        'city', v_city,
        'officeOrPostcode', nullif(v_office_or_postcode, ''),
        'details', nullif(v_delivery_details, '')
      ),
      'order', jsonb_build_object(
        'items', v_items,
        'subtotalPrice', v_subtotal,
        'couponCode', v_coupon_code,
        'discountPercentage', v_discount_percentage,
        'discountAmount', v_discount_amount,
        'totalPrice', v_total,
        'currency', 'EUR',
        'paymentMethod', 'cash_on_delivery',
        'idempotencyKey', p_idempotency_key
      )
    )
  )
  returning id into v_order_id;

  if v_coupon_id is not null then
    update public.discount_coupons
    set
      used_at = now(),
      used_order_id = v_order_id,
      updated_at = now()
    where id = v_coupon_id
      and used_at is null
      and used_order_id is null;

    if not found then
      raise exception 'coupon_used' using errcode = '22023';
    end if;
  end if;

  update public.store_order_requests
  set order_id = v_order_id
  where idempotency_key = p_idempotency_key;

  return v_order_id;
end;
$$;

revoke all on function public.create_store_order(jsonb, jsonb, jsonb, text, uuid, jsonb, text) from public;
revoke all on function public.create_store_order(jsonb, jsonb, jsonb, text, uuid, jsonb, text) from anon;
revoke all on function public.create_store_order(jsonb, jsonb, jsonb, text, uuid, jsonb, text) from authenticated;
grant execute on function public.create_store_order(jsonb, jsonb, jsonb, text, uuid, jsonb, text) to service_role;


-- ---------------------------------------------------------------------------
-- Coupon-aware personalization pricing trigger
-- Replaces apply_personalization_field_pricing so order coupons are preserved.
-- ---------------------------------------------------------------------------

create or replace function public.apply_personalization_field_pricing()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_items jsonb;
  v_item jsonb;
  v_item_index integer;
  v_product_id uuid;
  v_quantity integer;
  v_delta numeric(10, 2);
  v_unit_price numeric(10, 2);
  v_line_total numeric(10, 2);
  v_subtotal numeric(10, 2) := 0;
  v_discount_amount numeric(10, 2) := null;
  v_final numeric(10, 2);
begin
  v_items := new.raw_payload #> '{order,items}';

  if jsonb_typeof(v_items) <> 'array' then
    return new;
  end if;

  if jsonb_array_length(v_items) = 0 then
    return new;
  end if;

  for v_item_index in 0..jsonb_array_length(v_items) - 1
  loop
    v_item := v_items -> v_item_index;

    if
      not (v_item ? 'productId')
      or not (v_item ? 'unitPrice')
      or not (v_item ? 'quantity')
    then
      return new;
    end if;

    begin
      v_product_id := (v_item ->> 'productId')::uuid;
      v_quantity := greatest(1, (v_item ->> 'quantity')::integer);
      v_unit_price := coalesce((v_item ->> 'unitPrice')::numeric, 0);
    exception
      when others then
        return new;
    end;

    select coalesce(sum(field.price_delta), 0)
      into v_delta
      from jsonb_array_elements(
        case
          when jsonb_typeof(v_item -> 'personalizationFields') = 'array'
            then v_item -> 'personalizationFields'
          else '[]'::jsonb
        end
      ) as submitted(value)
      join public.product_personalization_fields field
        on field.id::text = submitted.value ->> 'fieldId'
       and field.product_id = v_product_id
      where nullif(btrim(coalesce(submitted.value ->> 'value', '')), '') is not null;

    v_unit_price := v_unit_price + v_delta;
    v_line_total := v_unit_price * v_quantity;
    v_subtotal := v_subtotal + v_line_total;

    v_item := jsonb_set(v_item, '{personalizationDelta}', to_jsonb(v_delta), true);
    v_item := jsonb_set(v_item, '{unitPrice}', to_jsonb(v_unit_price), true);
    v_item := jsonb_set(v_item, '{lineTotal}', to_jsonb(v_line_total), true);
    v_items := jsonb_set(v_items, array[v_item_index::text], v_item, false);
  end loop;

  begin
    v_discount_amount := nullif(btrim(coalesce(new.raw_payload #>> '{order,discountAmount}', '')), '')::numeric;
  exception
    when others then
      v_discount_amount := null;
  end;

  if v_discount_amount is not null and v_discount_amount > 0 then
    new.raw_payload := jsonb_set(
      new.raw_payload,
      '{order,subtotalPrice}',
      to_jsonb(v_subtotal),
      true
    );
    v_final := greatest(0, v_subtotal - v_discount_amount);
  else
    v_final := v_subtotal;
  end if;

  new.total_price := v_final;
  new.raw_payload := jsonb_set(new.raw_payload, '{order,items}', v_items, false);
  new.raw_payload := jsonb_set(
    new.raw_payload,
    '{order,totalPrice}',
    to_jsonb(v_final),
    true
  );

  return new;
end;
$$;
