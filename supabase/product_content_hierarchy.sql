-- Optional product subtitle and description content hierarchy.
-- Run before deploying app code that reads products.subtitle or calls v8 RPCs.

alter table public.products
  add column if not exists subtitle text;

alter table public.products
  alter column description drop not null;

create or replace function public.admin_create_product_v8(
  p_name text,
  p_subtitle text,
  p_description text,
  p_additional_info text,
  p_fulfillment_note text,
  p_price numeric,
  p_image_url text,
  p_is_customizable boolean,
  p_is_sold_out boolean,
  p_card_badge text,
  p_slug text,
  p_fulfillment_type text,
  p_stock_quantity integer,
  p_category_ids uuid[],
  p_primary_category_id uuid,
  p_color_fields jsonb,
  p_personalization_fields jsonb,
  p_wish_template_ids uuid[],
  p_option_groups jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product_id uuid;
begin
  perform public.assert_admin();

  v_product_id := public.admin_create_product_v7(
    p_name => p_name,
    p_description => coalesce(nullif(btrim(p_description), ''), p_name),
    p_additional_info => p_additional_info,
    p_fulfillment_note => p_fulfillment_note,
    p_price => p_price,
    p_image_url => p_image_url,
    p_is_customizable => p_is_customizable,
    p_is_sold_out => p_is_sold_out,
    p_card_badge => p_card_badge,
    p_slug => p_slug,
    p_fulfillment_type => p_fulfillment_type,
    p_stock_quantity => p_stock_quantity,
    p_category_ids => p_category_ids,
    p_primary_category_id => p_primary_category_id,
    p_color_fields => p_color_fields,
    p_personalization_fields => p_personalization_fields,
    p_wish_template_ids => p_wish_template_ids,
    p_option_groups => p_option_groups
  );

  update public.products
  set
    subtitle = nullif(btrim(p_subtitle), ''),
    description = nullif(btrim(p_description), '')
  where id = v_product_id;

  return v_product_id;
end;
$$;

create or replace function public.admin_update_product_v8(
  p_product_id uuid,
  p_name text,
  p_subtitle text,
  p_description text,
  p_additional_info text,
  p_fulfillment_note text,
  p_price numeric,
  p_image_url text,
  p_is_customizable boolean,
  p_is_sold_out boolean,
  p_card_badge text,
  p_slug text,
  p_fulfillment_type text,
  p_stock_quantity integer,
  p_category_ids uuid[],
  p_primary_category_id uuid,
  p_color_fields jsonb,
  p_personalization_fields jsonb,
  p_wish_template_ids uuid[],
  p_option_groups jsonb default '[]'::jsonb
)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_previous_image_url text;
  v_existing_description text;
begin
  perform public.assert_admin();

  select description
  into v_existing_description
  from public.products
  where id = p_product_id;

  if not found then
    raise exception 'product_not_found' using errcode = 'P0002';
  end if;

  v_previous_image_url := public.admin_update_product_v7(
    p_product_id => p_product_id,
    p_name => p_name,
    p_description => coalesce(
      nullif(btrim(p_description), ''),
      nullif(btrim(v_existing_description), ''),
      p_name
    ),
    p_additional_info => p_additional_info,
    p_fulfillment_note => p_fulfillment_note,
    p_price => p_price,
    p_image_url => p_image_url,
    p_is_customizable => p_is_customizable,
    p_is_sold_out => p_is_sold_out,
    p_card_badge => p_card_badge,
    p_slug => p_slug,
    p_fulfillment_type => p_fulfillment_type,
    p_stock_quantity => p_stock_quantity,
    p_category_ids => p_category_ids,
    p_primary_category_id => p_primary_category_id,
    p_color_fields => p_color_fields,
    p_personalization_fields => p_personalization_fields,
    p_wish_template_ids => p_wish_template_ids,
    p_option_groups => p_option_groups
  );

  update public.products
  set
    subtitle = nullif(btrim(p_subtitle), ''),
    description = nullif(btrim(p_description), '')
  where id = p_product_id;

  return v_previous_image_url;
end;
$$;

revoke all on function public.admin_create_product_v8(
  text, text, text, text, text, numeric, text, boolean, boolean, text, text, text, integer, uuid[], uuid, jsonb, jsonb, uuid[], jsonb
) from public;
revoke all on function public.admin_update_product_v8(
  uuid, text, text, text, text, text, numeric, text, boolean, boolean, text, text, text, integer, uuid[], uuid, jsonb, jsonb, uuid[], jsonb
) from public;

grant execute on function public.admin_create_product_v8(
  text, text, text, text, text, numeric, text, boolean, boolean, text, text, text, integer, uuid[], uuid, jsonb, jsonb, uuid[], jsonb
) to authenticated;
grant execute on function public.admin_update_product_v8(
  uuid, text, text, text, text, text, numeric, text, boolean, boolean, text, text, text, integer, uuid[], uuid, jsonb, jsonb, uuid[], jsonb
) to authenticated;
