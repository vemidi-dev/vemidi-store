-- Bouquet color quantity mode for product_color_fields.
-- Run after product_inventory_checkout_hardening.sql (#36).
-- Do not run on production without explicit approval.

begin;

alter table public.product_color_fields
  add column if not exists selection_mode text not null default 'choice',
  add column if not exists required_total_quantity integer null;

alter table public.product_color_fields
  drop constraint if exists product_color_fields_selection_mode_check;

alter table public.product_color_fields
  add constraint product_color_fields_selection_mode_check
  check (selection_mode in ('choice', 'quantity'));

alter table public.product_color_fields
  drop constraint if exists product_color_fields_quantity_total_check;

alter table public.product_color_fields
  add constraint product_color_fields_quantity_total_check
  check (
    (selection_mode = 'choice' and required_total_quantity is null)
    or (selection_mode = 'quantity' and required_total_quantity >= 1)
  );

create or replace function public.replace_product_configuration(
  p_product_id uuid,
  p_category_ids uuid[],
  p_color_fields jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_field record;
  v_field_id uuid;
  v_category_count integer;
  v_option_count integer;
  v_selection_mode text;
begin
  perform public.assert_admin();

  if coalesce(cardinality(p_category_ids), 0) = 0 then
    raise exception 'category_required' using errcode = '22023';
  end if;

  select count(*)
  into v_category_count
  from public.categories
  where id = any(p_category_ids);

  if v_category_count <> (
    select count(distinct category_id)
    from unnest(p_category_ids) as categories(category_id)
  ) then
    raise exception 'invalid_category' using errcode = '22023';
  end if;

  delete from public.product_categories where product_id = p_product_id;
  insert into public.product_categories (product_id, category_id)
  select p_product_id, category_id
  from (select distinct unnest(p_category_ids) as category_id) categories;

  delete from public.product_color_fields where product_id = p_product_id;

  for v_field in
    select *
    from jsonb_to_recordset(coalesce(p_color_fields, '[]'::jsonb)) as field(
      label text,
      group_id uuid,
      min_select integer,
      max_select integer,
      option_ids uuid[],
      sort_order integer,
      selection_mode text,
      required_total_quantity integer
    )
  loop
    v_selection_mode := coalesce(nullif(btrim(v_field.selection_mode), ''), 'choice');

    if v_selection_mode not in ('choice', 'quantity') then
      raise exception 'invalid_color_field' using errcode = '22023';
    end if;

    if
      nullif(btrim(v_field.label), '') is null
      or v_field.group_id is null
      or v_field.min_select < 0
      or v_field.max_select < 1
      or v_field.min_select > v_field.max_select
    then
      raise exception 'invalid_color_field' using errcode = '22023';
    end if;

    if v_selection_mode = 'quantity' then
      if coalesce(v_field.required_total_quantity, 0) < 1 then
        raise exception 'invalid_color_field' using errcode = '22023';
      end if;

      if coalesce(cardinality(v_field.option_ids), 0) < 1 then
        raise exception 'insufficient_color_options' using errcode = '22023';
      end if;
    elsif
      coalesce(cardinality(v_field.option_ids), 0) < v_field.min_select
      or coalesce(cardinality(v_field.option_ids), 0) < v_field.max_select
    then
      raise exception 'insufficient_color_options' using errcode = '22023';
    end if;

    if not exists (
      select 1 from public.color_groups where id = v_field.group_id
    ) then
      raise exception 'invalid_color_group' using errcode = '22023';
    end if;

    select count(*)
    into v_option_count
    from public.color_options
    where
      id = any(v_field.option_ids)
      and group_id = v_field.group_id
      and is_active = true;

    if v_option_count <> (
      select count(distinct option_id)
      from unnest(v_field.option_ids) as options(option_id)
    ) then
      raise exception 'invalid_color_option' using errcode = '22023';
    end if;

    insert into public.product_color_fields (
      product_id,
      group_id,
      label,
      enabled,
      min_select,
      max_select,
      sort_order,
      selection_mode,
      required_total_quantity
    )
    values (
      p_product_id,
      v_field.group_id,
      btrim(v_field.label),
      true,
      v_field.min_select,
      v_field.max_select,
      coalesce(v_field.sort_order, 0),
      v_selection_mode,
      case
        when v_selection_mode = 'quantity' then v_field.required_total_quantity
        else null
      end
    )
    returning id into v_field_id;

    insert into public.product_color_field_options (field_id, color_option_id)
    select v_field_id, option_id
    from (select distinct unnest(v_field.option_ids) as option_id) options;
  end loop;
end;
$$;

create or replace function public.validate_product_color_selections_for_order(
  p_product_id uuid,
  p_selected_colors jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_field record;
  v_selected_count integer;
  v_quantity_sum integer;
begin
  for v_field in
    select id, min_select, max_select, selection_mode, required_total_quantity
    from public.product_color_fields
    where product_id = p_product_id and enabled = true
  loop
    if v_field.selection_mode = 'quantity' then
      select coalesce(sum(
        case
          when coalesce(selected ->> 'quantity', '') ~ '^[0-9]+$'
            then greatest((selected ->> 'quantity')::integer, 0)
          else 0
        end
      ), 0)
      into v_quantity_sum
      from jsonb_array_elements(coalesce(p_selected_colors, '[]'::jsonb)) as choices(selected)
      where selected ->> 'fieldId' = v_field.id::text;

      if v_quantity_sum <> coalesce(v_field.required_total_quantity, 0) then
        raise exception 'invalid_color_count' using errcode = '22023';
      end if;
    else
      select count(distinct selected ->> 'optionId')
      into v_selected_count
      from jsonb_array_elements(coalesce(p_selected_colors, '[]'::jsonb)) as choices(selected)
      where selected ->> 'fieldId' = v_field.id::text;

      if v_selected_count < v_field.min_select or v_selected_count > v_field.max_select then
        raise exception 'invalid_color_count' using errcode = '22023';
      end if;
    end if;
  end loop;
end;
$$;

drop function if exists public.create_store_order(jsonb, jsonb, jsonb, text, uuid);

create or replace function public.create_store_order(
  p_customer jsonb,
  p_delivery jsonb,
  p_items jsonb,
  p_note text,
  p_idempotency_key uuid,
  p_attribution jsonb default null
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
  v_color_quantity integer;
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
    order by d.product_id
  loop
    select
      id,
      is_sold_out,
      fulfillment_type,
      stock_quantity
    into v_product
    from public.products
    where id = v_demand.product_id
    for update;

    if not found then
      raise exception 'product_not_found' using errcode = 'P0002';
    end if;

    if coalesce(v_product.is_sold_out, false) then
      raise exception 'product_sold_out' using errcode = '22023';
    end if;

    if v_product.fulfillment_type = 'unavailable' then
      raise exception 'product_unavailable' using errcode = '22023';
    end if;

    if v_product.fulfillment_type = 'stocked' then
      if coalesce(v_product.stock_quantity, 0) < v_demand.quantity then
        raise exception 'insufficient_stock' using errcode = '22023';
      end if;

      v_stock_before := v_product.stock_quantity;
      v_stock_after := v_stock_before - v_demand.quantity;
      v_stock_snapshots := v_stock_snapshots || jsonb_build_object(
        v_demand.product_id::text,
        jsonb_build_object(
          'stockQuantityBefore', v_stock_before,
          'stockQuantityAfter', v_stock_after
        )
      );
    end if;
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
      stock_quantity
      into v_product
      from public.products
      where id = v_product_id;

    if not found then
      raise exception 'product_not_found' using errcode = 'P0002';
    end if;

    if coalesce(v_product.is_sold_out, false) then
      raise exception 'product_sold_out' using errcode = '22023';
    end if;

    if v_product.fulfillment_type = 'unavailable' then
      raise exception 'product_unavailable' using errcode = '22023';
    end if;

    if v_product.fulfillment_type = 'stocked'
      and coalesce(v_product.stock_quantity, 0) < v_quantity then
      raise exception 'insufficient_stock' using errcode = '22023';
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

    perform public.validate_product_color_selections_for_order(
      v_product_id,
      coalesce(v_item -> 'selectedColors', '[]'::jsonb)
    );

    v_colors := '[]'::jsonb;
    for v_color_input in
      select selected
      from jsonb_array_elements(coalesce(v_item -> 'selectedColors', '[]'::jsonb))
        as choices(selected)
    loop
      begin
        v_field_id := (v_color_input ->> 'fieldId')::uuid;
        v_option_id := (v_color_input ->> 'optionId')::uuid;
        v_color_quantity := case
          when coalesce(v_color_input ->> 'quantity', '') ~ '^[0-9]+$'
            then (v_color_input ->> 'quantity')::integer
          else null
        end;
      exception
        when others then
          raise exception 'invalid_color_selection' using errcode = '22023';
      end;

      if coalesce(v_color_quantity, 1) <= 0 then
        continue;
      end if;

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
        case
          when v_color_quantity is not null then
            jsonb_build_object(
              'fieldId', v_field_id,
              'fieldLabel', v_color.field_label,
              'groupId', v_color.group_id,
              'groupKey', v_color.group_key,
              'groupLabel', v_color.group_label,
              'optionId', v_color.option_id,
              'optionName', v_color.option_name,
              'optionHex', v_color.option_hex,
              'quantity', v_color_quantity
            )
          else
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
        end
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
        'totalPrice', v_total,
        'currency', 'EUR',
        'paymentMethod', 'cash_on_delivery',
        'idempotencyKey', p_idempotency_key
      )
    )
  )
  returning id into v_order_id;

  update public.store_order_requests
  set order_id = v_order_id
  where idempotency_key = p_idempotency_key;

  return v_order_id;
end;
$$;

revoke all on function public.create_store_order(jsonb, jsonb, jsonb, text, uuid, jsonb) from public;
revoke all on function public.create_store_order(jsonb, jsonb, jsonb, text, uuid, jsonb) from anon;
revoke all on function public.create_store_order(jsonb, jsonb, jsonb, text, uuid, jsonb) from authenticated;
grant execute on function public.create_store_order(jsonb, jsonb, jsonb, text, uuid, jsonb) to service_role;

commit;
