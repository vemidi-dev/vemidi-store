-- Optional follow-up: copy primary_category_id when duplicating a product.
-- Run AFTER product_primary_category_seo.sql and product_content_hierarchy.sql.
-- Safe to re-run: replaces admin_duplicate_product only.
-- Copies primary_category_id and subtitle without changing slug/product_code/fulfillment behavior.

create or replace function public.admin_duplicate_product(
  p_product_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source record;
  v_new_product_id uuid;
  v_new_group_id uuid;
  v_new_value_id uuid;
  v_new_field_id uuid;
  v_group_map jsonb := '{}'::jsonb;
  v_value_map jsonb := '{}'::jsonb;
  v_remapped_depends_on uuid;
  v_group record;
  v_value record;
  v_color_field record;
  v_new_slug text;
  v_new_product_code text;
  v_next_code bigint;
  v_attempt integer;
  v_duplicate_stock integer;
begin
  perform public.assert_admin();

  select *
  into v_source
  from public.products
  where id = p_product_id;

  if not found then
    raise exception 'product_not_found' using errcode = 'P0002';
  end if;

  v_duplicate_stock := case
    when coalesce(v_source.fulfillment_type, 'made_to_order') = 'stocked' then 0
    else null
  end;

  v_next_code := nextval('public.product_code_seq');
  v_new_product_code := 'VM-' || lpad(v_next_code::text, 6, '0');

  for v_attempt in 1..5 loop
    v_new_slug := public.reserve_unique_product_slug(
      coalesce(v_source.slug, public.slugify_product_name(v_source.name)) || '-copy'
    );
    begin
      insert into public.products (
        name,
        subtitle,
        description,
        additional_info,
        fulfillment_note,
        price,
        image_url,
        is_customizable,
        is_sold_out,
        card_badge,
        slug,
        product_code,
        fulfillment_type,
        stock_quantity,
        primary_category_id
      )
      values (
        'Копие на ' || btrim(v_source.name),
        v_source.subtitle,
        v_source.description,
        v_source.additional_info,
        v_source.fulfillment_note,
        v_source.price,
        null,
        coalesce(v_source.is_customizable, false),
        false,
        v_source.card_badge,
        v_new_slug,
        v_new_product_code,
        coalesce(v_source.fulfillment_type, 'made_to_order'),
        v_duplicate_stock,
        v_source.primary_category_id
      )
      returning id into v_new_product_id;
      exit;
    exception
      when unique_violation then
        if v_attempt >= 5 then
          raise exception 'slug_unavailable' using errcode = '22023';
        end if;
    end;
  end loop;

  if v_new_product_id is null then
    raise exception 'slug_unavailable' using errcode = '22023';
  end if;

  insert into public.product_categories (product_id, category_id)
  select v_new_product_id, category_id
  from public.product_categories
  where product_id = p_product_id;

  for v_color_field in
    select *
    from public.product_color_fields
    where product_id = p_product_id
    order by sort_order, created_at
  loop
    insert into public.product_color_fields (
      product_id,
      group_id,
      label,
      enabled,
      min_select,
      max_select,
      sort_order
    )
    values (
      v_new_product_id,
      v_color_field.group_id,
      v_color_field.label,
      v_color_field.enabled,
      v_color_field.min_select,
      v_color_field.max_select,
      v_color_field.sort_order
    )
    returning id into v_new_field_id;

    insert into public.product_color_field_options (field_id, color_option_id)
    select v_new_field_id, color_option_id
    from public.product_color_field_options
    where field_id = v_color_field.id;
  end loop;

  insert into public.product_personalization_fields (
    product_id,
    label,
    field_key,
    field_type,
    placeholder,
    max_length,
    price_delta,
    is_required,
    allows_wish_templates,
    sort_order
  )
  select
    v_new_product_id,
    label,
    field_key,
    field_type,
    placeholder,
    max_length,
    price_delta,
    is_required,
    allows_wish_templates,
    sort_order
  from public.product_personalization_fields
  where product_id = p_product_id
  order by sort_order, created_at;

  insert into public.product_wish_templates (product_id, wish_template_id, sort_order)
  select v_new_product_id, wish_template_id, sort_order
  from public.product_wish_templates
  where product_id = p_product_id
  order by sort_order;

  for v_group in
    select *
    from public.product_option_groups
    where product_id = p_product_id
    order by sort_order, created_at
  loop
    insert into public.product_option_groups (
      product_id,
      name,
      key,
      input_type,
      is_required,
      min_select,
      max_select,
      sort_order,
      is_active,
      pricing_mode,
      depends_on_option_id,
      placeholder,
      max_length,
      text_price_delta
    )
    values (
      v_new_product_id,
      v_group.name,
      v_group.key,
      v_group.input_type,
      v_group.is_required,
      v_group.min_select,
      v_group.max_select,
      v_group.sort_order,
      v_group.is_active,
      v_group.pricing_mode,
      null,
      v_group.placeholder,
      v_group.max_length,
      v_group.text_price_delta
    )
    returning id into v_new_group_id;

    v_group_map := v_group_map || jsonb_build_object(v_group.id::text, v_new_group_id::text);

    for v_value in
      select *
      from public.product_option_values
      where group_id = v_group.id
      order by sort_order, created_at
    loop
      insert into public.product_option_values (
        group_id,
        label,
        key,
        price_delta,
        is_default,
        is_active,
        is_sold_out,
        sku,
        sort_order
      )
      values (
        v_new_group_id,
        v_value.label,
        v_value.key,
        v_value.price_delta,
        v_value.is_default,
        v_value.is_active,
        v_value.is_sold_out,
        v_value.sku,
        v_value.sort_order
      )
      returning id into v_new_value_id;

      v_value_map := v_value_map || jsonb_build_object(v_value.id::text, v_new_value_id::text);
    end loop;
  end loop;

  for v_group in
    select *
    from public.product_option_groups
    where product_id = p_product_id
      and depends_on_option_id is not null
  loop
    v_new_group_id := (v_group_map ->> v_group.id::text)::uuid;
    v_remapped_depends_on := (v_value_map ->> v_group.depends_on_option_id::text)::uuid;

    if v_new_group_id is not null and v_remapped_depends_on is not null then
      update public.product_option_groups
      set depends_on_option_id = v_remapped_depends_on
      where id = v_new_group_id;
    end if;
  end loop;

  return v_new_product_id;
end;
$$;

revoke all on function public.admin_duplicate_product(uuid) from public;
grant execute on function public.admin_duplicate_product(uuid) to authenticated;
