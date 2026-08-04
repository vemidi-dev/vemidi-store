-- Run manually in Supabase before using the new option-group image size UI.
-- Moves visual card size from product_materials to product_option_groups.
-- Safe to re-run.

alter table public.product_option_groups
  add column if not exists image_display_size text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'product_option_groups_image_display_size_check'
  ) then
    alter table public.product_option_groups
      add constraint product_option_groups_image_display_size_check
      check (
        image_display_size is null
        or image_display_size in ('small', 'medium', 'large')
      );
  end if;
end $$;

create or replace function public.upsert_product_option_groups(
  p_product_id uuid,
  p_groups jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_group jsonb;
  v_value jsonb;
  v_group_id uuid;
  v_value_id uuid;
  v_input_type text;
  v_depends_on uuid;
  v_dep_parent_group uuid;
  v_seen_group_ids uuid[] := array[]::uuid[];
  v_payload_group_ids uuid[] := array[]::uuid[];
  v_existing_ids uuid[];
  v_value_ids uuid[];
  v_default_count integer;
  v_walk uuid;
  v_steps integer;
  v_image_display_size text;
begin
  perform public.assert_admin();

  for v_group in
    select value from jsonb_array_elements(coalesce(p_groups, '[]'::jsonb))
  loop
    v_input_type := coalesce(v_group ->> 'input_type', '');
    v_image_display_size := nullif(btrim(v_group ->> 'image_display_size'), '');

    if nullif(btrim(v_group ->> 'name'), '') is null
      or nullif(btrim(v_group ->> 'key'), '') is null
      or v_input_type not in ('single', 'multiple', 'text', 'textarea', 'date')
    then
      raise exception 'invalid_option_group' using errcode = '22023';
    end if;

    if (v_group ->> 'min_select')::integer is null
      or (v_group ->> 'max_select')::integer is null
      or (v_group ->> 'min_select')::integer < 0
      or (v_group ->> 'max_select')::integer < (v_group ->> 'min_select')::integer
    then
      raise exception 'invalid_option_group_limits' using errcode = '22023';
    end if;

    if v_input_type = 'single' and (v_group ->> 'max_select')::integer <> 1 then
      raise exception 'invalid_option_group_single_max' using errcode = '22023';
    end if;

    if v_input_type in ('text', 'textarea', 'date') then
      if (v_group ->> 'min_select')::integer <> 0
        or (v_group ->> 'max_select')::integer <> 0
      then
        raise exception 'invalid_option_group_text_limits' using errcode = '22023';
      end if;

      if jsonb_array_length(coalesce(v_group -> 'values', '[]'::jsonb)) > 0 then
        raise exception 'invalid_option_group_text_values' using errcode = '22023';
      end if;
    end if;

    if coalesce((v_group ->> 'text_price_delta')::numeric, 0) < 0 then
      raise exception 'invalid_option_text_price_delta' using errcode = '22023';
    end if;

    if v_image_display_size is not null
      and v_image_display_size not in ('small', 'medium', 'large')
    then
      raise exception 'invalid_option_group_image_display_size' using errcode = '22023';
    end if;

    v_depends_on := nullif(v_group ->> 'depends_on_option_id', '')::uuid;
    if v_depends_on is not null then
      select grp.id
        into v_dep_parent_group
        from public.product_option_values val
        join public.product_option_groups grp on grp.id = val.group_id
        where val.id = v_depends_on
          and grp.product_id = p_product_id;

      if not found then
        raise exception 'invalid_option_dependency' using errcode = '22023';
      end if;
    end if;

    if nullif(v_group ->> 'id', '') is not null then
      v_payload_group_ids := array_append(
        v_payload_group_ids,
        (v_group ->> 'id')::uuid
      );
    end if;
  end loop;

  select coalesce(array_agg(id), array[]::uuid[])
    into v_existing_ids
    from public.product_option_groups
    where product_id = p_product_id;

  delete from public.product_option_groups
  where product_id = p_product_id
    and id <> all(v_payload_group_ids);

  for v_group in
    select value from jsonb_array_elements(coalesce(p_groups, '[]'::jsonb))
  loop
    v_input_type := v_group ->> 'input_type';
    v_depends_on := nullif(v_group ->> 'depends_on_option_id', '')::uuid;
    v_group_id := nullif(v_group ->> 'id', '')::uuid;
    v_image_display_size := nullif(btrim(v_group ->> 'image_display_size'), '');

    if v_group_id is not null
      and exists (
        select 1 from public.product_option_groups
        where id = v_group_id and product_id = p_product_id
      )
    then
      update public.product_option_groups
      set
        name = btrim(v_group ->> 'name'),
        key = btrim(v_group ->> 'key'),
        input_type = v_input_type,
        is_required = coalesce((v_group ->> 'is_required')::boolean, false),
        min_select = (v_group ->> 'min_select')::integer,
        max_select = (v_group ->> 'max_select')::integer,
        sort_order = coalesce((v_group ->> 'sort_order')::integer, 0),
        is_active = coalesce((v_group ->> 'is_active')::boolean, true),
        pricing_mode = coalesce(nullif(v_group ->> 'pricing_mode', ''), 'delta'),
        depends_on_option_id = v_depends_on,
        placeholder = nullif(btrim(v_group ->> 'placeholder'), ''),
        max_length = nullif(v_group ->> 'max_length', '')::integer,
        text_price_delta = coalesce((v_group ->> 'text_price_delta')::numeric, 0),
        image_display_size = v_image_display_size,
        updated_at = now()
      where id = v_group_id;
    else
      insert into public.product_option_groups (
        product_id, name, key, input_type, is_required, min_select, max_select,
        sort_order, is_active, pricing_mode, depends_on_option_id,
        placeholder, max_length, text_price_delta, image_display_size
      )
      values (
        p_product_id,
        btrim(v_group ->> 'name'),
        btrim(v_group ->> 'key'),
        v_input_type,
        coalesce((v_group ->> 'is_required')::boolean, false),
        (v_group ->> 'min_select')::integer,
        (v_group ->> 'max_select')::integer,
        coalesce((v_group ->> 'sort_order')::integer, 0),
        coalesce((v_group ->> 'is_active')::boolean, true),
        coalesce(nullif(v_group ->> 'pricing_mode', ''), 'delta'),
        v_depends_on,
        nullif(btrim(v_group ->> 'placeholder'), ''),
        nullif(v_group ->> 'max_length', '')::integer,
        coalesce((v_group ->> 'text_price_delta')::numeric, 0),
        v_image_display_size
      )
      returning id into v_group_id;
    end if;

    v_seen_group_ids := array_append(v_seen_group_ids, v_group_id);
    v_value_ids := array[]::uuid[];

    if v_input_type in ('single', 'multiple') then
      select count(*)
        into v_default_count
        from jsonb_array_elements(coalesce(v_group -> 'values', '[]'::jsonb)) as vals(value)
        where coalesce((value ->> 'is_default')::boolean, false);

      if v_input_type = 'single' and v_default_count > 1 then
        raise exception 'invalid_option_default_count' using errcode = '22023';
      end if;

      for v_value in
        select value from jsonb_array_elements(coalesce(v_group -> 'values', '[]'::jsonb))
      loop
        if nullif(btrim(v_value ->> 'label'), '') is null
          or nullif(btrim(v_value ->> 'key'), '') is null
        then
          raise exception 'invalid_option_value' using errcode = '22023';
        end if;

        if coalesce((v_value ->> 'price_delta')::numeric, 0) < 0 then
          raise exception 'invalid_option_price_delta' using errcode = '22023';
        end if;

        v_value_id := nullif(v_value ->> 'id', '')::uuid;

        if v_value_id is not null
          and exists (
            select 1 from public.product_option_values
            where id = v_value_id and group_id = v_group_id
          )
        then
          update public.product_option_values
          set
            label = btrim(v_value ->> 'label'),
            key = btrim(v_value ->> 'key'),
            price_delta = coalesce((v_value ->> 'price_delta')::numeric, 0),
            is_default = coalesce((v_value ->> 'is_default')::boolean, false),
            is_active = coalesce((v_value ->> 'is_active')::boolean, true),
            is_sold_out = coalesce((v_value ->> 'is_sold_out')::boolean, false),
            image_url = nullif(btrim(v_value ->> 'image_url'), ''),
            material_id = nullif(btrim(v_value ->> 'material_id'), '')::uuid,
            sku = nullif(btrim(v_value ->> 'sku'), ''),
            sort_order = coalesce((v_value ->> 'sort_order')::integer, 0),
            updated_at = now()
          where id = v_value_id;
        else
          insert into public.product_option_values (
            group_id, label, key, price_delta, is_default, is_active,
            is_sold_out, image_url, material_id, sku, sort_order
          )
          values (
            v_group_id,
            btrim(v_value ->> 'label'),
            btrim(v_value ->> 'key'),
            coalesce((v_value ->> 'price_delta')::numeric, 0),
            coalesce((v_value ->> 'is_default')::boolean, false),
            coalesce((v_value ->> 'is_active')::boolean, true),
            coalesce((v_value ->> 'is_sold_out')::boolean, false),
            nullif(btrim(v_value ->> 'image_url'), ''),
            nullif(btrim(v_value ->> 'material_id'), '')::uuid,
            nullif(btrim(v_value ->> 'sku'), ''),
            coalesce((v_value ->> 'sort_order')::integer, 0)
          )
          returning id into v_value_id;
        end if;

        v_value_ids := array_append(v_value_ids, v_value_id);
      end loop;

      delete from public.product_option_values
      where group_id = v_group_id
        and id <> all(v_value_ids);
    else
      delete from public.product_option_values where group_id = v_group_id;
    end if;
  end loop;

  for v_group_id in
    select id from public.product_option_groups where product_id = p_product_id
    union
    select unnest(v_payload_group_ids)
  loop
    v_walk := v_group_id;
    v_steps := 0;
    loop
      v_dep_parent_group := public._option_group_dependency_parent(v_walk);
      exit when v_dep_parent_group is null;
      if v_dep_parent_group = v_group_id then
        raise exception 'invalid_option_dependency_cycle' using errcode = '22023';
      end if;
      v_walk := v_dep_parent_group;
      v_steps := v_steps + 1;
      if v_steps > 50 then
        raise exception 'invalid_option_dependency_cycle' using errcode = '22023';
      end if;
    end loop;
  end loop;
end;
$$;

create or replace function public.admin_duplicate_product(
  p_product_id uuid
)
returns uuid
language plpgsql
security invoker
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
begin
  perform public.assert_admin();

  select *
  into v_source
  from public.products
  where id = p_product_id;

  if not found then
    raise exception 'product_not_found' using errcode = 'P0002';
  end if;

  insert into public.products (
    name,
    description,
    additional_info,
    fulfillment_note,
    price,
    image_url,
    is_customizable,
    is_sold_out,
    card_badge
  )
  values (
    'Копие на ' || btrim(v_source.name),
    v_source.description,
    v_source.additional_info,
    v_source.fulfillment_note,
    v_source.price,
    null,
    coalesce(v_source.is_customizable, false),
    false,
    v_source.card_badge
  )
  returning id into v_new_product_id;

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
  order by sort_order;

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
    v_new_group_id := gen_random_uuid();
    v_group_map := v_group_map || jsonb_build_object(v_group.id::text, v_new_group_id::text);

    insert into public.product_option_groups (
      id,
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
      text_price_delta,
      image_display_size
    )
    values (
      v_new_group_id,
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
      v_group.text_price_delta,
      v_group.image_display_size
    );

    for v_value in
      select *
      from public.product_option_values
      where group_id = v_group.id
      order by sort_order, created_at
    loop
      v_new_value_id := gen_random_uuid();
      v_value_map := v_value_map || jsonb_build_object(v_value.id::text, v_new_value_id::text);

      insert into public.product_option_values (
        id,
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
        v_new_value_id,
        v_new_group_id,
        v_value.label,
        v_value.key,
        v_value.price_delta,
        v_value.is_default,
        v_value.is_active,
        v_value.is_sold_out,
        v_value.sku,
        v_value.sort_order
      );
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

    if v_new_group_id is null or v_remapped_depends_on is null then
      raise exception 'invalid_option_dependency' using errcode = '22023';
    end if;

    update public.product_option_groups
    set depends_on_option_id = v_remapped_depends_on
    where id = v_new_group_id;
  end loop;

  return v_new_product_id;
end;
$$;

revoke all on function public.admin_duplicate_product(uuid) from public;
grant execute on function public.admin_duplicate_product(uuid) to authenticated;
