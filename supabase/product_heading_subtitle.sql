-- Product heading subtitle (H2 under title on storefront product page).
-- Safe to re-run. Does not modify slug, merchandising, or option configuration.
-- Run manually in Supabase BEFORE deploying app code that calls admin_create_product_v11/admin_update_product_v11.

begin;

alter table public.products
  add column if not exists heading_subtitle text;

comment on column public.products.heading_subtitle is
  'Optional H2 subheading shown directly under the product title on the storefront page.';

create or replace function public.admin_create_product_v11(
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
  p_option_groups jsonb default '[]'::jsonb,
  p_meta_title text default null,
  p_meta_description text default null,
  p_og_title text default null,
  p_og_description text default null,
  p_personalization_info text default null,
  p_dimensions_materials text default null,
  p_ordering_info text default null,
  p_heading_subtitle text default null
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

  v_product_id := public.admin_create_product_v10(
    p_name => p_name,
    p_subtitle => p_subtitle,
    p_description => p_description,
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
    p_option_groups => p_option_groups,
    p_meta_title => p_meta_title,
    p_meta_description => p_meta_description,
    p_og_title => p_og_title,
    p_og_description => p_og_description,
    p_personalization_info => p_personalization_info,
    p_dimensions_materials => p_dimensions_materials,
    p_ordering_info => p_ordering_info
  );

  update public.products
  set heading_subtitle = nullif(btrim(p_heading_subtitle), '')
  where id = v_product_id;

  return v_product_id;
end;
$$;

create or replace function public.admin_update_product_v11(
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
  p_option_groups jsonb default '[]'::jsonb,
  p_meta_title text default null,
  p_meta_description text default null,
  p_og_title text default null,
  p_og_description text default null,
  p_personalization_info text default null,
  p_dimensions_materials text default null,
  p_ordering_info text default null,
  p_heading_subtitle text default null
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

  v_previous_image_url := public.admin_update_product_v10(
    p_product_id => p_product_id,
    p_name => p_name,
    p_subtitle => p_subtitle,
    p_description => p_description,
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
    p_option_groups => p_option_groups,
    p_meta_title => p_meta_title,
    p_meta_description => p_meta_description,
    p_og_title => p_og_title,
    p_og_description => p_og_description,
    p_personalization_info => p_personalization_info,
    p_dimensions_materials => p_dimensions_materials,
    p_ordering_info => p_ordering_info
  );

  update public.products
  set heading_subtitle = nullif(btrim(p_heading_subtitle), '')
  where id = p_product_id;

  return v_previous_image_url;
end;
$$;

revoke all on function public.admin_create_product_v11(
  text, text, text, text, text, numeric, text, boolean, boolean, text, text, text, integer, uuid[], uuid, jsonb, jsonb, uuid[], jsonb, text, text, text, text, text, text, text, text
) from public;
revoke all on function public.admin_update_product_v11(
  uuid, text, text, text, text, text, numeric, text, boolean, boolean, text, text, text, integer, uuid[], uuid, jsonb, jsonb, uuid[], jsonb, text, text, text, text, text, text, text, text
) from public;

grant execute on function public.admin_create_product_v11(
  text, text, text, text, text, numeric, text, boolean, boolean, text, text, text, integer, uuid[], uuid, jsonb, jsonb, uuid[], jsonb, text, text, text, text, text, text, text, text
) to authenticated;
grant execute on function public.admin_update_product_v11(
  uuid, text, text, text, text, text, numeric, text, boolean, boolean, text, text, text, integer, uuid[], uuid, jsonb, jsonb, uuid[], jsonb, text, text, text, text, text, text, text, text
) to authenticated;

commit;
