-- Optional storefront badge for product cards (e.g. Ново, По поръчка).
-- Run after product_sold_out.sql.

alter table public.products
  add column if not exists card_badge text;

alter table public.products
  drop constraint if exists products_card_badge_check;

alter table public.products
  add constraint products_card_badge_check check (
    card_badge is null
    or card_badge in (
      'Ръчна изработка',
      'По поръчка',
      'Ново',
      'Най-продавано'
    )
  );

drop function if exists public.admin_create_product_v3(
  text, text, text, text, numeric, text, boolean, boolean, uuid[], jsonb, jsonb, uuid[]
);

drop function if exists public.admin_update_product_v3(
  uuid, text, text, text, text, numeric, text, boolean, boolean, uuid[], jsonb, jsonb, uuid[]
);

create or replace function public.admin_create_product_v3(
  p_name text,
  p_description text,
  p_additional_info text,
  p_fulfillment_note text,
  p_price numeric,
  p_image_url text,
  p_is_customizable boolean,
  p_is_sold_out boolean,
  p_card_badge text,
  p_category_ids uuid[],
  p_color_fields jsonb,
  p_personalization_fields jsonb,
  p_wish_template_ids uuid[]
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
    is_customizable, is_sold_out, card_badge
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
    nullif(btrim(p_card_badge), '')
  )
  returning id into v_product_id;

  perform public.replace_product_configuration(v_product_id, p_category_ids, p_color_fields);
  perform public.replace_product_personalization_fields(v_product_id, p_personalization_fields);
  perform public.replace_product_wish_templates(v_product_id, p_wish_template_ids);

  return v_product_id;
end;
$$;

create or replace function public.admin_update_product_v3(
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
  p_category_ids uuid[],
  p_color_fields jsonb,
  p_personalization_fields jsonb,
  p_wish_template_ids uuid[]
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

  select image_url into v_previous_image_url
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
    is_customizable = coalesce(p_is_customizable, false),
    is_sold_out = coalesce(p_is_sold_out, false),
    card_badge = nullif(btrim(p_card_badge), '')
  where id = p_product_id;

  perform public.replace_product_configuration(p_product_id, p_category_ids, p_color_fields);
  perform public.replace_product_personalization_fields(p_product_id, p_personalization_fields);
  perform public.replace_product_wish_templates(p_product_id, p_wish_template_ids);

  return v_previous_image_url;
end;
$$;

revoke all on function public.admin_create_product_v3(
  text, text, text, text, numeric, text, boolean, boolean, text, uuid[], jsonb, jsonb, uuid[]
) from public;
revoke all on function public.admin_update_product_v3(
  uuid, text, text, text, text, numeric, text, boolean, boolean, text, uuid[], jsonb, jsonb, uuid[]
) from public;

grant execute on function public.admin_create_product_v3(
  text, text, text, text, numeric, text, boolean, boolean, text, uuid[], jsonb, jsonb, uuid[]
) to authenticated;
grant execute on function public.admin_update_product_v3(
  uuid, text, text, text, text, numeric, text, boolean, boolean, text, uuid[], jsonb, jsonb, uuid[]
) to authenticated;
