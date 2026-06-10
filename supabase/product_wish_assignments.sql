-- Assign wish templates directly to products and include them in atomic product saves.
-- Run after atomic_product_personalization.sql.

create table if not exists public.product_wish_templates (
  product_id uuid not null references public.products(id) on delete cascade,
  wish_template_id uuid not null references public.wish_templates(id) on delete cascade,
  sort_order integer not null default 0,
  primary key (product_id, wish_template_id)
);

create index if not exists product_wish_templates_product_idx
  on public.product_wish_templates(product_id, sort_order);

insert into public.product_wish_templates (product_id, wish_template_id, sort_order)
select distinct
  product_category.product_id,
  wish_occasion.wish_template_id,
  coalesce(wish.sort_order, 0)
from public.product_categories product_category
join public.categories category
  on category.id = product_category.category_id
  and category.category_type = 'occasion'
join public.wish_template_occasions wish_occasion
  on wish_occasion.category_id = product_category.category_id
join public.wish_templates wish
  on wish.id = wish_occasion.wish_template_id
on conflict (product_id, wish_template_id) do nothing;

alter table public.product_wish_templates enable row level security;

grant select on public.product_wish_templates to anon, authenticated;
grant insert, update, delete on public.product_wish_templates to authenticated;

drop policy if exists "product_wishes_public_read" on public.product_wish_templates;
create policy "product_wishes_public_read"
on public.product_wish_templates for select to anon, authenticated
using (true);

drop policy if exists "product_wishes_admin_all" on public.product_wish_templates;
create policy "product_wishes_admin_all"
on public.product_wish_templates for all to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create or replace function public.replace_product_wish_templates(
  p_product_id uuid,
  p_wish_template_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform public.assert_admin();

  delete from public.product_wish_templates
  where product_id = p_product_id;

  if coalesce(array_length(p_wish_template_ids, 1), 0) = 0 then
    return;
  end if;

  if exists (
    select 1
    from unnest(p_wish_template_ids) as selected(wish_template_id)
    left join public.wish_templates wish
      on wish.id = selected.wish_template_id
    where wish.id is null
  ) then
    raise exception 'invalid_wish_template' using errcode = '22023';
  end if;

  insert into public.product_wish_templates (
    product_id,
    wish_template_id,
    sort_order
  )
  select
    p_product_id,
    selected.wish_template_id,
    selected.ordinality - 1
  from unnest(p_wish_template_ids) with ordinality
    as selected(wish_template_id, ordinality)
  on conflict (product_id, wish_template_id) do update
  set sort_order = excluded.sort_order;
end;
$$;

create or replace function public.admin_create_product_v3(
  p_name text,
  p_description text,
  p_additional_info text,
  p_fulfillment_note text,
  p_price numeric,
  p_image_url text,
  p_is_customizable boolean,
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
    is_customizable = coalesce(p_is_customizable, false)
  where id = p_product_id;

  perform public.replace_product_configuration(p_product_id, p_category_ids, p_color_fields);
  perform public.replace_product_personalization_fields(p_product_id, p_personalization_fields);
  perform public.replace_product_wish_templates(p_product_id, p_wish_template_ids);

  return v_previous_image_url;
end;
$$;

revoke all on function public.replace_product_wish_templates(uuid, uuid[]) from public;
revoke all on function public.admin_create_product_v3(
  text, text, text, text, numeric, text, boolean, uuid[], jsonb, jsonb, uuid[]
) from public;
revoke all on function public.admin_update_product_v3(
  uuid, text, text, text, text, numeric, text, boolean, uuid[], jsonb, jsonb, uuid[]
) from public;

grant execute on function public.replace_product_wish_templates(uuid, uuid[]) to authenticated;
grant execute on function public.admin_create_product_v3(
  text, text, text, text, numeric, text, boolean, uuid[], jsonb, jsonb, uuid[]
) to authenticated;
grant execute on function public.admin_update_product_v3(
  uuid, text, text, text, text, numeric, text, boolean, uuid[], jsonb, jsonb, uuid[]
) to authenticated;
