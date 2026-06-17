-- Add a stable primary product category for SEO breadcrumbs and related links.
-- Run before deploying app code that calls admin_create_product_v7/admin_update_product_v7.

alter table public.products
  add column if not exists primary_category_id uuid
  references public.categories (id) on delete set null;

create index if not exists products_primary_category_id_idx
  on public.products (primary_category_id);

update public.products as product
set primary_category_id = picked.category_id
from (
  select distinct on (product_category.product_id)
    product_category.product_id,
    product_category.category_id
  from public.product_categories as product_category
  join public.categories as category
    on category.id = product_category.category_id
  where category.category_type = 'product'
  order by
    product_category.product_id,
    case when category.parent_id is not null then 0 else 1 end,
    category.home_sort_order desc,
    category.name asc
) as picked
where product.id = picked.product_id
  and product.primary_category_id is null;

create or replace function public.validate_product_primary_category()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.primary_category_id is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.categories
    where id = new.primary_category_id
      and category_type = 'product'
  ) then
    raise exception 'invalid_primary_category' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.product_categories
    where product_id = new.id
      and category_id = new.primary_category_id
  ) then
    raise exception 'primary_category_not_assigned' using errcode = '22023';
  end if;

  return new;
end;
$$;

drop trigger if exists products_validate_primary_category on public.products;
create constraint trigger products_validate_primary_category
after insert or update of primary_category_id on public.products
deferrable initially deferred
for each row
execute function public.validate_product_primary_category();

create or replace function public.replace_product_configuration_v2(
  p_product_id uuid,
  p_category_ids uuid[],
  p_primary_category_id uuid,
  p_color_fields jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_primary_category_count integer;
begin
  perform public.replace_product_configuration(
    p_product_id,
    p_category_ids,
    p_color_fields
  );

  if p_primary_category_id is null then
    raise exception 'primary_category_required' using errcode = '22023';
  end if;

  select count(*)
  into v_primary_category_count
  from public.categories
  where id = p_primary_category_id
    and category_type = 'product';

  if v_primary_category_count <> 1 then
    raise exception 'invalid_primary_category' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.product_categories
    where product_id = p_product_id
      and category_id = p_primary_category_id
  ) then
    raise exception 'primary_category_not_assigned' using errcode = '22023';
  end if;

  update public.products
  set primary_category_id = p_primary_category_id
  where id = p_product_id;
end;
$$;

create or replace function public.admin_create_product_v7(
  p_name text,
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
  v_slug text;
  v_product_code text;
  v_slug_base text;
  v_next_code bigint;
  v_attempt integer;
  v_inserted boolean := false;
  v_fulfillment_type text := coalesce(nullif(btrim(p_fulfillment_type), ''), 'made_to_order');
begin
  perform public.assert_admin();

  if nullif(btrim(p_name), '') is null or nullif(btrim(p_description), '') is null then
    raise exception 'product_text_required' using errcode = '22023';
  end if;
  if p_price is null or p_price < 0 then
    raise exception 'invalid_price' using errcode = '22023';
  end if;

  perform public.validate_product_fulfillment_fields(v_fulfillment_type, p_stock_quantity);

  v_slug_base := coalesce(
    nullif(btrim(p_slug), ''),
    public.slugify_product_name(p_name)
  );
  v_next_code := nextval('public.product_code_seq');
  v_product_code := 'VM-' || lpad(v_next_code::text, 6, '0');

  for v_attempt in 1..5 loop
    v_slug := public.reserve_unique_product_slug(v_slug_base);
    begin
      insert into public.products (
        name, description, additional_info, fulfillment_note, price, image_url,
        is_customizable, is_sold_out, card_badge, slug, product_code,
        fulfillment_type, stock_quantity
      )
      values (
        btrim(p_name),
        btrim(p_description),
        nullif(btrim(p_additional_info), ''),
        nullif(btrim(p_fulfillment_note), ''),
        p_price,
        nullif(btrim(p_image_url), ''),
        coalesce(p_is_customizable, false),
        coalesce(p_is_sold_out, false),
        nullif(btrim(p_card_badge), ''),
        v_slug,
        v_product_code,
        v_fulfillment_type,
        case when v_fulfillment_type = 'stocked' then p_stock_quantity else null end
      )
      returning id into v_product_id;
      v_inserted := true;
      exit;
    exception
      when unique_violation then
        if v_attempt >= 5 then
          raise exception 'slug_unavailable' using errcode = '22023';
        end if;
    end;
  end loop;

  if not v_inserted then
    raise exception 'slug_unavailable' using errcode = '22023';
  end if;

  perform public.replace_product_configuration_v2(
    v_product_id,
    p_category_ids,
    p_primary_category_id,
    p_color_fields
  );
  perform public.replace_product_personalization_fields(v_product_id, p_personalization_fields);
  perform public.replace_product_wish_templates(v_product_id, p_wish_template_ids);
  perform public.upsert_product_option_groups(v_product_id, p_option_groups);

  return v_product_id;
end;
$$;

create or replace function public.admin_update_product_v7(
  p_product_id uuid,
  p_name text,
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
  v_current_slug text;
  v_new_slug text;
  v_fulfillment_type text := coalesce(nullif(btrim(p_fulfillment_type), ''), 'made_to_order');
begin
  perform public.assert_admin();

  if nullif(btrim(p_name), '') is null or nullif(btrim(p_description), '') is null then
    raise exception 'product_text_required' using errcode = '22023';
  end if;
  if p_price is null or p_price < 0 then
    raise exception 'invalid_price' using errcode = '22023';
  end if;

  perform public.validate_product_fulfillment_fields(v_fulfillment_type, p_stock_quantity);

  select image_url, slug
  into v_previous_image_url, v_current_slug
  from public.products
  where id = p_product_id
  for update;

  if not found then
    raise exception 'product_not_found' using errcode = 'P0002';
  end if;

  v_new_slug := public.assert_valid_product_slug(p_slug);
  if public.is_product_slug_taken(v_new_slug, p_product_id) then
    raise exception 'slug_taken' using errcode = '22023';
  end if;

  if v_current_slug is distinct from v_new_slug then
    perform public.record_product_slug_change(p_product_id, v_current_slug, v_new_slug);
  end if;

  begin
    update public.products
    set
      name = btrim(p_name),
      description = btrim(p_description),
      additional_info = nullif(btrim(p_additional_info), ''),
      fulfillment_note = nullif(btrim(p_fulfillment_note), ''),
      price = p_price,
      image_url = nullif(btrim(p_image_url), ''),
      is_customizable = coalesce(p_is_customizable, false),
      is_sold_out = coalesce(p_is_sold_out, false),
      card_badge = nullif(btrim(p_card_badge), ''),
      slug = v_new_slug,
      fulfillment_type = v_fulfillment_type,
      stock_quantity = case when v_fulfillment_type = 'stocked' then p_stock_quantity else null end
    where id = p_product_id;
  exception
    when unique_violation then
      raise exception 'slug_taken' using errcode = '22023';
  end;

  perform public.replace_product_configuration_v2(
    p_product_id,
    p_category_ids,
    p_primary_category_id,
    p_color_fields
  );
  perform public.replace_product_personalization_fields(p_product_id, p_personalization_fields);
  perform public.replace_product_wish_templates(p_product_id, p_wish_template_ids);
  perform public.upsert_product_option_groups(p_product_id, p_option_groups);

  return v_previous_image_url;
end;
$$;

-- NOTE: admin_duplicate_product is intentionally NOT replaced here.
-- Production already ships the fulfillment-aware duplicate RPC from
-- product_inventory_fulfillment.sql (slug, product_code, fulfillment).
-- Patching it in this migration would risk regressing duplicate behavior.
-- Copied products may keep primary_category_id = null until the next admin save;
-- storefront SEO falls back to the existing category heuristic until then.

revoke all on function public.validate_product_primary_category() from public;
revoke all on function public.replace_product_configuration_v2(uuid, uuid[], uuid, jsonb) from public;
revoke all on function public.admin_create_product_v7(
  text, text, text, text, numeric, text, boolean, boolean, text, text, text, integer, uuid[], uuid, jsonb, jsonb, uuid[], jsonb
) from public;
revoke all on function public.admin_update_product_v7(
  uuid, text, text, text, text, numeric, text, boolean, boolean, text, text, text, integer, uuid[], uuid, jsonb, jsonb, uuid[], jsonb
) from public;

grant execute on function public.replace_product_configuration_v2(uuid, uuid[], uuid, jsonb) to authenticated;
grant execute on function public.admin_create_product_v7(
  text, text, text, text, numeric, text, boolean, boolean, text, text, text, integer, uuid[], uuid, jsonb, jsonb, uuid[], jsonb
) to authenticated;
grant execute on function public.admin_update_product_v7(
  uuid, text, text, text, text, numeric, text, boolean, boolean, text, text, text, integer, uuid[], uuid, jsonb, jsonb, uuid[], jsonb
) to authenticated;
