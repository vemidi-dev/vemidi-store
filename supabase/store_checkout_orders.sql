-- Create storefront orders in the shared public.orders table.
-- Prices and product names are always loaded from public.products.

create or replace function public.create_store_order(
  p_customer jsonb,
  p_delivery jsonb,
  p_items jsonb,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
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
  v_order_id uuid;
  v_customer_name text := trim(coalesce(p_customer ->> 'name', ''));
  v_customer_phone text := regexp_replace(coalesce(p_customer ->> 'phone', ''), '\s+', '', 'g');
  v_customer_email text := nullif(trim(coalesce(p_customer ->> 'email', '')), '');
  v_courier text := p_delivery ->> 'courier';
  v_delivery_type text := p_delivery ->> 'type';
  v_city text := trim(coalesce(p_delivery ->> 'city', ''));
  v_office_or_postcode text := trim(coalesce(p_delivery ->> 'officeOrPostcode', ''));
  v_delivery_details text := trim(coalesce(p_delivery ->> 'details', ''));
begin
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

    select id, name, price, is_customizable
      into v_product
      from public.products
      where id = v_product_id;

    if not found then
      raise exception 'product_not_found' using errcode = 'P0002';
    end if;

    if v_product.price is null or v_product.price < 0 then
      raise exception 'invalid_product_price' using errcode = '22023';
    end if;

    v_personalization := nullif(trim(coalesce(v_item ->> 'personalization', '')), '');
    if char_length(coalesce(v_personalization, '')) > 50 then
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

    v_total := v_total + (v_product.price * v_quantity);
    v_product_names := array_append(v_product_names, v_product.name);
    v_items := v_items || jsonb_build_array(
      jsonb_build_object(
        'productId', v_product.id,
        'name', v_product.name,
        'unitPrice', v_product.price,
        'quantity', v_quantity,
        'lineTotal', v_product.price * v_quantity,
        'personalization', v_personalization,
        'selectedColors', v_colors
      )
    );
  end loop;

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
      'source', 'vemidi-store',
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
        'paymentMethod', 'cash_on_delivery'
      )
    )
  )
  returning id into v_order_id;

  return v_order_id;
end;
$$;

revoke all on function public.create_store_order(jsonb, jsonb, jsonb, text) from public;
grant execute on function public.create_store_order(jsonb, jsonb, jsonb, text) to anon;
grant execute on function public.create_store_order(jsonb, jsonb, jsonb, text) to authenticated;
