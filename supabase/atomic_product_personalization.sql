-- Add personalization fields to the atomic product create/update operations.
-- Run after product_personalization_and_wishes.sql and atomic_product_admin_functions.sql.

grant select, insert, update, delete
  on public.product_personalization_fields
  to authenticated;

create or replace function public.replace_product_personalization_fields(
  p_product_id uuid,
  p_fields jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_field record;
  v_keys text[] := array[]::text[];
begin
  perform public.assert_admin();

  delete from public.product_personalization_fields
  where product_id = p_product_id;

  for v_field in
    select *
    from jsonb_to_recordset(coalesce(p_fields, '[]'::jsonb)) as field(
      label text,
      field_key text,
      field_type text,
      placeholder text,
      max_length integer,
      is_required boolean,
      allows_wish_templates boolean,
      sort_order integer
    )
  loop
    if
      nullif(btrim(v_field.label), '') is null
      or v_field.field_key !~ '^[a-z][a-z0-9_]{0,63}$'
      or v_field.field_type not in ('text', 'textarea', 'date')
      or v_field.max_length < 1
      or v_field.max_length > 1000
      or v_field.field_key = any(v_keys)
    then
      raise exception 'invalid_personalization_field' using errcode = '22023';
    end if;

    v_keys := array_append(v_keys, v_field.field_key);

    insert into public.product_personalization_fields (
      product_id,
      label,
      field_key,
      field_type,
      placeholder,
      max_length,
      is_required,
      allows_wish_templates,
      sort_order
    )
    values (
      p_product_id,
      btrim(v_field.label),
      v_field.field_key,
      v_field.field_type,
      nullif(btrim(v_field.placeholder), ''),
      v_field.max_length,
      coalesce(v_field.is_required, false),
      coalesce(v_field.allows_wish_templates, false),
      coalesce(v_field.sort_order, 0)
    );
  end loop;
end;
$$;

create or replace function public.admin_create_product_v2(
  p_name text,
  p_description text,
  p_additional_info text,
  p_fulfillment_note text,
  p_price numeric,
  p_image_url text,
  p_is_customizable boolean,
  p_category_ids uuid[],
  p_color_fields jsonb,
  p_personalization_fields jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_product_id uuid;
begin
  perform public.assert_admin();

  if nullif(btrim(p_name), '') is null or nullif(btrim(p_description), '') is null then
    raise exception 'product_text_required' using errcode = '22023';
  end if;
  if p_price is null or p_price < 0 then
    raise exception 'invalid_price' using errcode = '22023';
  end if;

  insert into public.products (
    name, description, additional_info, fulfillment_note, price, image_url,
    is_customizable
  )
  values (
    btrim(p_name),
    btrim(p_description),
    nullif(btrim(p_additional_info), ''),
    nullif(btrim(p_fulfillment_note), ''),
    p_price,
    nullif(btrim(p_image_url), ''),
    coalesce(p_is_customizable, false)
  )
  returning id into v_product_id;

  perform public.replace_product_configuration(
    v_product_id,
    p_category_ids,
    p_color_fields
  );
  perform public.replace_product_personalization_fields(
    v_product_id,
    p_personalization_fields
  );

  return v_product_id;
end;
$$;

create or replace function public.admin_update_product_v2(
  p_product_id uuid,
  p_name text,
  p_description text,
  p_additional_info text,
  p_fulfillment_note text,
  p_price numeric,
  p_image_url text,
  p_is_customizable boolean,
  p_category_ids uuid[],
  p_color_fields jsonb,
  p_personalization_fields jsonb
)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_previous_image_url text;
begin
  perform public.assert_admin();

  if nullif(btrim(p_name), '') is null or nullif(btrim(p_description), '') is null then
    raise exception 'product_text_required' using errcode = '22023';
  end if;
  if p_price is null or p_price < 0 then
    raise exception 'invalid_price' using errcode = '22023';
  end if;

  select image_url
  into v_previous_image_url
  from public.products
  where id = p_product_id
  for update;

  if not found then
    raise exception 'product_not_found' using errcode = 'P0002';
  end if;

  update public.products
  set
    name = btrim(p_name),
    description = btrim(p_description),
    additional_info = nullif(btrim(p_additional_info), ''),
    fulfillment_note = nullif(btrim(p_fulfillment_note), ''),
    price = p_price,
    image_url = nullif(btrim(p_image_url), ''),
    is_customizable = coalesce(p_is_customizable, false)
  where id = p_product_id;

  perform public.replace_product_configuration(
    p_product_id,
    p_category_ids,
    p_color_fields
  );
  perform public.replace_product_personalization_fields(
    p_product_id,
    p_personalization_fields
  );

  return v_previous_image_url;
end;
$$;

revoke all on function public.replace_product_personalization_fields(uuid, jsonb)
  from public;
revoke all on function public.admin_create_product_v2(
  text, text, text, text, numeric, text, boolean, uuid[], jsonb, jsonb
) from public;
revoke all on function public.admin_update_product_v2(
  uuid, text, text, text, text, numeric, text, boolean, uuid[], jsonb, jsonb
) from public;

grant execute on function public.replace_product_personalization_fields(uuid, jsonb)
  to authenticated;
grant execute on function public.admin_create_product_v2(
  text, text, text, text, numeric, text, boolean, uuid[], jsonb, jsonb
) to authenticated;
grant execute on function public.admin_update_product_v2(
  uuid, text, text, text, text, numeric, text, boolean, uuid[], jsonb, jsonb
) to authenticated;
