-- Hotfix for product create failing with PostgreSQL 23502 (not_null_violation)
-- after migration #34 when slug/product_code are NOT NULL but admin RPCs still
-- insert products without them.
--
-- Run in Supabase SQL editor if adding a product shows error 23502.
-- Safe to re-run (CREATE OR REPLACE).

begin;

create or replace function public.admin_create_product_v5(
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
  p_category_ids uuid[],
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
begin
  perform public.assert_admin();

  if nullif(btrim(p_name), '') is null or nullif(btrim(p_description), '') is null then
    raise exception 'product_text_required' using errcode = '22023';
  end if;
  if p_price is null or p_price < 0 then
    raise exception 'invalid_price' using errcode = '22023';
  end if;

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
        is_customizable, is_sold_out, card_badge, slug, product_code
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
        v_product_code
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

  perform public.replace_product_configuration(v_product_id, p_category_ids, p_color_fields);
  perform public.replace_product_personalization_fields(v_product_id, p_personalization_fields);
  perform public.replace_product_wish_templates(v_product_id, p_wish_template_ids);
  perform public.upsert_product_option_groups(v_product_id, p_option_groups);

  return v_product_id;
end;
$$;

create or replace function public.admin_create_product_v4(
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
  p_wish_template_ids uuid[],
  p_option_groups jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
begin
  return public.admin_create_product_v5(
    p_name,
    p_description,
    p_additional_info,
    p_fulfillment_note,
    p_price,
    p_image_url,
    p_is_customizable,
    p_is_sold_out,
    p_card_badge,
    '',
    p_category_ids,
    p_color_fields,
    p_personalization_fields,
    p_wish_template_ids,
    p_option_groups
  );
end;
$$;

revoke all on function public.admin_create_product_v5(
  text, text, text, text, numeric, text, boolean, boolean, text, text, uuid[], jsonb, jsonb, uuid[], jsonb
) from public;
grant execute on function public.admin_create_product_v5(
  text, text, text, text, numeric, text, boolean, boolean, text, text, uuid[], jsonb, jsonb, uuid[], jsonb
) to authenticated;

revoke all on function public.admin_create_product_v4(
  text, text, text, text, numeric, text, boolean, boolean, text, uuid[], jsonb, jsonb, uuid[], jsonb
) from public;
grant execute on function public.admin_create_product_v4(
  text, text, text, text, numeric, text, boolean, boolean, text, uuid[], jsonb, jsonb, uuid[], jsonb
) to authenticated;

commit;
