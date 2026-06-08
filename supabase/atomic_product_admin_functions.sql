-- Atomic admin product mutations.
-- Run after products_table.sql, add_product_color_configuration.sql, and admin_auth.sql.

-- RLS policies alone are not enough; PostgREST roles also need table privileges.
grant select on public.products to anon, authenticated;
grant select on public.categories to anon, authenticated;
grant select on public.product_categories to anon, authenticated;
grant select on public.color_groups to anon, authenticated;
grant select on public.color_options to anon, authenticated;
grant select on public.product_color_fields to anon, authenticated;
grant select on public.product_color_field_options to anon, authenticated;

-- The RPCs are SECURITY INVOKER, so authenticated admins also need table-level
-- write privileges. RLS policies still restrict these operations to admin_users.
grant insert, update, delete on public.products to authenticated;
grant insert, update, delete on public.product_categories to authenticated;
grant insert, update, delete on public.product_color_fields to authenticated;
grant insert, update, delete on public.product_color_field_options to authenticated;

create or replace function public.assert_admin()
returns void
language plpgsql
stable
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin(auth.uid()) then
    raise exception 'admin_required' using errcode = '42501';
  end if;
end;
$$;

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

  -- Options are removed by ON DELETE CASCADE.
  delete from public.product_color_fields where product_id = p_product_id;

  for v_field in
    select *
    from jsonb_to_recordset(coalesce(p_color_fields, '[]'::jsonb)) as field(
      label text,
      group_id uuid,
      min_select integer,
      max_select integer,
      option_ids uuid[],
      sort_order integer
    )
  loop
    if
      nullif(btrim(v_field.label), '') is null
      or v_field.group_id is null
      or v_field.min_select < 0
      or v_field.max_select < 1
      or v_field.min_select > v_field.max_select
    then
      raise exception 'invalid_color_field' using errcode = '22023';
    end if;

    if not exists (
      select 1 from public.color_groups where id = v_field.group_id
    ) then
      raise exception 'invalid_color_group' using errcode = '22023';
    end if;

    if
      coalesce(cardinality(v_field.option_ids), 0) < v_field.min_select
      or coalesce(cardinality(v_field.option_ids), 0) < v_field.max_select
    then
      raise exception 'insufficient_color_options' using errcode = '22023';
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
      sort_order
    )
    values (
      p_product_id,
      v_field.group_id,
      btrim(v_field.label),
      true,
      v_field.min_select,
      v_field.max_select,
      coalesce(v_field.sort_order, 0)
    )
    returning id into v_field_id;

    insert into public.product_color_field_options (field_id, color_option_id)
    select v_field_id, option_id
    from (select distinct unnest(v_field.option_ids) as option_id) options;
  end loop;
end;
$$;

create or replace function public.admin_create_product(
  p_name text,
  p_description text,
  p_additional_info text,
  p_fulfillment_note text,
  p_price numeric,
  p_image_url text,
  p_is_customizable boolean,
  p_category_ids uuid[],
  p_color_fields jsonb
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
    name,
    description,
    additional_info,
    fulfillment_note,
    price,
    image_url,
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

  return v_product_id;
end;
$$;

create or replace function public.admin_update_product(
  p_product_id uuid,
  p_name text,
  p_description text,
  p_additional_info text,
  p_fulfillment_note text,
  p_price numeric,
  p_image_url text,
  p_is_customizable boolean,
  p_category_ids uuid[],
  p_color_fields jsonb
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

  return v_previous_image_url;
end;
$$;

create or replace function public.admin_delete_product(p_product_id uuid)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_image_url text;
begin
  perform public.assert_admin();

  delete from public.products
  where id = p_product_id
  returning image_url into v_image_url;

  if not found then
    raise exception 'product_not_found' using errcode = 'P0002';
  end if;

  return v_image_url;
end;
$$;

revoke all on function public.assert_admin() from public;
revoke all on function public.replace_product_configuration(uuid, uuid[], jsonb) from public;
revoke all on function public.admin_create_product(
  text, text, text, text, numeric, text, boolean, uuid[], jsonb
) from public;
revoke all on function public.admin_update_product(
  uuid, text, text, text, text, numeric, text, boolean, uuid[], jsonb
) from public;
revoke all on function public.admin_delete_product(uuid) from public;

grant execute on function public.assert_admin() to authenticated;
grant execute on function public.replace_product_configuration(uuid, uuid[], jsonb) to authenticated;
grant execute on function public.admin_create_product(
  text, text, text, text, numeric, text, boolean, uuid[], jsonb
) to authenticated;
grant execute on function public.admin_update_product(
  uuid, text, text, text, text, numeric, text, boolean, uuid[], jsonb
) to authenticated;
grant execute on function public.admin_delete_product(uuid) to authenticated;
