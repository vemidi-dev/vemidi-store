-- Product SEO metadata fields for admin-managed meta/OG copy.
-- Safe to re-run. Does not modify slug, description body, or merchandising fields.
-- Run before deploying app code that calls admin_create_product_v9/admin_update_product_v9.

begin;

alter table public.products
  add column if not exists meta_title text,
  add column if not exists meta_description text,
  add column if not exists og_title text,
  add column if not exists og_description text;

comment on column public.products.meta_title is
  'Optional HTML title override for the product page.';
comment on column public.products.meta_description is
  'Optional meta description override.';
comment on column public.products.og_title is
  'Optional Open Graph title override.';
comment on column public.products.og_description is
  'Optional Open Graph description override.';

alter table public.products
  drop constraint if exists products_meta_title_length_check;
alter table public.products
  add constraint products_meta_title_length_check check (
    meta_title is null or char_length(meta_title) <= 120
  );

alter table public.products
  drop constraint if exists products_og_title_length_check;
alter table public.products
  add constraint products_og_title_length_check check (
    og_title is null or char_length(og_title) <= 120
  );

alter table public.products
  drop constraint if exists products_meta_description_length_check;
alter table public.products
  add constraint products_meta_description_length_check check (
    meta_description is null or char_length(meta_description) <= 160
  );

alter table public.products
  drop constraint if exists products_og_description_length_check;
alter table public.products
  add constraint products_og_description_length_check check (
    og_description is null or char_length(og_description) <= 160
  );

create or replace function public.admin_create_product_v9(
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
  p_og_description text default null
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

  v_product_id := public.admin_create_product_v8(
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
    p_option_groups => p_option_groups
  );

  update public.products
  set
    meta_title = nullif(btrim(p_meta_title), ''),
    meta_description = nullif(btrim(p_meta_description), ''),
    og_title = nullif(btrim(p_og_title), ''),
    og_description = nullif(btrim(p_og_description), '')
  where id = v_product_id;

  return v_product_id;
end;
$$;

create or replace function public.admin_update_product_v9(
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
  p_og_description text default null
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

  v_previous_image_url := public.admin_update_product_v8(
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
    p_option_groups => p_option_groups
  );

  update public.products
  set
    meta_title = nullif(btrim(p_meta_title), ''),
    meta_description = nullif(btrim(p_meta_description), ''),
    og_title = nullif(btrim(p_og_title), ''),
    og_description = nullif(btrim(p_og_description), '')
  where id = p_product_id;

  return v_previous_image_url;
end;
$$;

revoke all on function public.admin_create_product_v9(
  text, text, text, text, text, numeric, text, boolean, boolean, text, text, text, integer, uuid[], uuid, jsonb, jsonb, uuid[], jsonb, text, text, text, text
) from public;
revoke all on function public.admin_update_product_v9(
  uuid, text, text, text, text, text, numeric, text, boolean, boolean, text, text, text, integer, uuid[], uuid, jsonb, jsonb, uuid[], jsonb, text, text, text, text
) from public;

grant execute on function public.admin_create_product_v9(
  text, text, text, text, text, numeric, text, boolean, boolean, text, text, text, integer, uuid[], uuid, jsonb, jsonb, uuid[], jsonb, text, text, text, text
) to authenticated;
grant execute on function public.admin_update_product_v9(
  uuid, text, text, text, text, text, numeric, text, boolean, boolean, text, text, text, integer, uuid[], uuid, jsonb, jsonb, uuid[], jsonb, text, text, text, text
) to authenticated;

commit;
