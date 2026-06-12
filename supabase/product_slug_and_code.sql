-- Product SEO slugs, human-readable product codes, and slug history.
-- Run after site_content_settings.sql (migration #34).
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE where applicable.
-- Wrapped in an explicit transaction so a failed step rolls back the whole migration.

begin;

-- ---------------------------------------------------------------------------
-- Columns and sequence
-- ---------------------------------------------------------------------------

alter table public.products
  add column if not exists slug text,
  add column if not exists product_code text;

create sequence if not exists public.product_code_seq;

revoke all on sequence public.product_code_seq from public;
revoke all on sequence public.product_code_seq from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Slug history (reserved slugs from previous URLs)
-- ---------------------------------------------------------------------------

create table if not exists public.product_slug_history (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  slug text not null,
  created_at timestamptz not null default now(),
  constraint product_slug_history_slug_not_empty check (char_length(btrim(slug)) > 0)
);

create unique index if not exists product_slug_history_slug_key
  on public.product_slug_history (slug);

create index if not exists product_slug_history_product_id_idx
  on public.product_slug_history (product_id);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.is_uuid_text(p_value text)
returns boolean
language sql
immutable
as $$
  select p_value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
$$;

create or replace function public.transliterate_bg_slug(p_value text)
returns text
language plpgsql
immutable
as $$
declare
  v_input text := lower(coalesce(p_value, ''));
  v_output text := '';
  v_char text;
  v_index integer;
  v_map constant jsonb := '{
    "а":"a","б":"b","в":"v","г":"g","д":"d","е":"e","ж":"zh","з":"z","и":"i","й":"y",
    "к":"k","л":"l","м":"m","н":"n","о":"o","п":"p","р":"r","с":"s","т":"t","у":"u",
    "ф":"f","х":"h","ц":"ts","ч":"ch","ш":"sh","щ":"sht","ъ":"a","ь":"","ю":"yu","я":"ya"
  }'::jsonb;
begin
  for v_index in 1..char_length(v_input) loop
    v_char := substring(v_input from v_index for 1);
    if v_map ? v_char then
      v_output := v_output || (v_map ->> v_char);
    else
      v_output := v_output || v_char;
    end if;
  end loop;
  return v_output;
end;
$$;

create or replace function public.slugify_product_name(p_name text)
returns text
language plpgsql
immutable
as $$
declare
  v_slug text;
begin
  v_slug := public.transliterate_bg_slug(p_name);
  v_slug := regexp_replace(v_slug, '[«»„“”"''`´&]', ' ', 'g');
  v_slug := lower(v_slug);
  v_slug := regexp_replace(v_slug, '[^a-z0-9]+', '-', 'g');
  v_slug := regexp_replace(v_slug, '-{2,}', '-', 'g');
  v_slug := regexp_replace(v_slug, '(^-+|-+$)', '', 'g');
  v_slug := left(v_slug, 80);
  v_slug := regexp_replace(v_slug, '-+$', '', 'g');
  return v_slug;
end;
$$;

create or replace function public.assert_valid_product_slug(p_slug text)
returns text
language plpgsql
immutable
as $$
declare
  v_slug text := lower(btrim(coalesce(p_slug, '')));
begin
  if v_slug = '' then
    raise exception 'invalid_product_slug' using errcode = '22023';
  end if;
  if char_length(v_slug) > 80 then
    raise exception 'invalid_product_slug' using errcode = '22023';
  end if;
  if public.is_uuid_text(v_slug) then
    raise exception 'invalid_product_slug' using errcode = '22023';
  end if;
  if v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'invalid_product_slug' using errcode = '22023';
  end if;
  return v_slug;
end;
$$;

create or replace function public.is_product_slug_taken(
  p_slug text,
  p_exclude_product_id uuid default null
)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.products product
    where product.slug = lower(btrim(p_slug))
      and (p_exclude_product_id is null or product.id <> p_exclude_product_id)
  )
  or exists (
    select 1
    from public.product_slug_history history
    where history.slug = lower(btrim(p_slug))
      and (p_exclude_product_id is null or history.product_id <> p_exclude_product_id)
  );
$$;

create or replace function public.append_product_slug_suffix(
  p_base text,
  p_suffix integer
)
returns text
language plpgsql
immutable
as $$
declare
  v_base text := coalesce(p_base, '');
  v_suffix text := '-' || p_suffix::text;
  v_trimmed_base text;
begin
  if char_length(v_base) + char_length(v_suffix) <= 80 then
    return v_base || v_suffix;
  end if;

  v_trimmed_base := left(v_base, 80 - char_length(v_suffix));
  v_trimmed_base := regexp_replace(v_trimmed_base, '-+$', '', 'g');

  if v_trimmed_base = '' then
    raise exception 'invalid_product_slug' using errcode = '22023';
  end if;

  return v_trimmed_base || v_suffix;
end;
$$;

create or replace function public.reserve_unique_product_slug(
  p_base_slug text,
  p_exclude_product_id uuid default null
)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_base text;
  v_candidate text;
  v_suffix integer := 2;
begin
  v_base := public.slugify_product_name(p_base_slug);
  if v_base = '' then
    v_base := 'product';
  end if;

  v_candidate := public.assert_valid_product_slug(v_base);
  if not public.is_product_slug_taken(v_candidate, p_exclude_product_id) then
    return v_candidate;
  end if;

  loop
    v_candidate := public.assert_valid_product_slug(
      public.append_product_slug_suffix(v_base, v_suffix)
    );
    if not public.is_product_slug_taken(v_candidate, p_exclude_product_id) then
      return v_candidate;
    end if;
    v_suffix := v_suffix + 1;
    if v_suffix > 9999 then
      raise exception 'slug_unavailable' using errcode = '22023';
    end if;
  end loop;
end;
$$;

create or replace function public.next_product_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next bigint;
begin
  perform public.assert_admin();
  v_next := nextval('public.product_code_seq');
  return 'VM-' || lpad(v_next::text, 6, '0');
end;
$$;

create or replace function public.record_product_slug_change(
  p_product_id uuid,
  p_old_slug text,
  p_new_slug text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_old_slug text := lower(btrim(coalesce(p_old_slug, '')));
  v_new_slug text := lower(btrim(coalesce(p_new_slug, '')));
begin
  if v_old_slug = '' or v_old_slug = v_new_slug then
    return;
  end if;

  begin
    insert into public.product_slug_history (product_id, slug)
    values (p_product_id, v_old_slug);
  exception
    when unique_violation then
      if not exists (
        select 1
        from public.product_slug_history history
        where history.slug = v_old_slug
          and history.product_id = p_product_id
      ) then
        raise exception 'slug_history_conflict' using errcode = '22023';
      end if;
  end;
end;
$$;

-- ---------------------------------------------------------------------------
-- Backfill existing products
-- ---------------------------------------------------------------------------

do $$
declare
  v_product record;
  v_slug_base text;
  v_slug text;
begin
  for v_product in
    select id, name
    from public.products
    where slug is null or btrim(slug) = ''
    order by created_at, id
  loop
    v_slug_base := public.slugify_product_name(v_product.name);
    v_slug := public.reserve_unique_product_slug(v_slug_base, v_product.id);
    update public.products
    set slug = v_slug
    where id = v_product.id;
  end loop;
end;
$$;

with numbered as (
  select
    id,
    row_number() over (order by created_at, id) as rn
  from public.products
)
update public.products product
set product_code = 'VM-' || lpad(numbered.rn::text, 6, '0')
from numbered
where product.id = numbered.id
  and (product.product_code is null or btrim(product.product_code) = '');

-- Align the sequence with existing VM-###### codes.
-- setval(value, is_called):
--   is_called = false  => the sequence has NOT yet returned value; next nextval() returns value.
--   is_called = true   => value was already returned; next nextval() returns value + 1.
-- Empty catalog: setval(1, false) so the first next_product_code() is VM-000001.
-- N populated products: setval(max_code, true) so the next code is VM-(max+1 padded).
do $$
declare
  v_max_code bigint;
begin
  select max(substring(product.product_code from 4)::bigint)
  into v_max_code
  from public.products product
  where product.product_code ~ '^VM-[0-9]{6}$';

  if v_max_code is null then
    perform setval('public.product_code_seq', 1, false);
  else
    perform setval('public.product_code_seq', v_max_code, true);
  end if;
end;
$$;

alter table public.products
  alter column slug set not null,
  alter column product_code set not null;

create unique index if not exists products_slug_key on public.products (slug);
create unique index if not exists products_product_code_key on public.products (product_code);

-- ---------------------------------------------------------------------------
-- RLS for slug history (public read for storefront redirects, admin insert only)
-- ---------------------------------------------------------------------------

alter table public.product_slug_history enable row level security;

grant select on public.product_slug_history to anon, authenticated;
grant insert on public.product_slug_history to authenticated;

drop policy if exists "product_slug_history_public_read" on public.product_slug_history;
create policy "product_slug_history_public_read"
on public.product_slug_history
for select
to anon, authenticated
using (true);

drop policy if exists "product_slug_history_admin_insert" on public.product_slug_history;
create policy "product_slug_history_admin_insert"
on public.product_slug_history
for insert
to authenticated
with check (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- Helper function privileges (no direct public/anon access)
-- ---------------------------------------------------------------------------

revoke all on function public.is_uuid_text(text) from public;
revoke all on function public.transliterate_bg_slug(text) from public;
revoke all on function public.slugify_product_name(text) from public;
revoke all on function public.assert_valid_product_slug(text) from public;
revoke all on function public.is_product_slug_taken(text, uuid) from public;
revoke all on function public.reserve_unique_product_slug(text, uuid) from public;
revoke all on function public.append_product_slug_suffix(text, integer) from public;
revoke all on function public.record_product_slug_change(uuid, text, text) from public;
revoke all on function public.next_product_code() from public;
revoke all on function public.next_product_code() from anon;

grant execute on function public.append_product_slug_suffix(text, integer) to authenticated;
grant execute on function public.is_uuid_text(text) to authenticated;
grant execute on function public.transliterate_bg_slug(text) to authenticated;
grant execute on function public.slugify_product_name(text) to authenticated;
grant execute on function public.assert_valid_product_slug(text) to authenticated;
grant execute on function public.is_product_slug_taken(text, uuid) to authenticated;
grant execute on function public.reserve_unique_product_slug(text, uuid) to authenticated;
grant execute on function public.record_product_slug_change(uuid, text, text) to authenticated;
grant execute on function public.next_product_code() to authenticated;

-- next_product_code() is SECURITY DEFINER and calls assert_admin() before nextval().
-- authenticated non-admins may invoke it but receive admin_required; anon cannot execute.
-- product_code_seq stays owner-only so direct nextval() is blocked for client roles.

-- ---------------------------------------------------------------------------
-- Admin product RPC v5 (slug-aware)
-- ---------------------------------------------------------------------------

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

create or replace function public.admin_update_product_v5(
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
  p_category_ids uuid[],
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
begin
  perform public.assert_admin();

  if nullif(btrim(p_name), '') is null or nullif(btrim(p_description), '') is null then
    raise exception 'product_text_required' using errcode = '22023';
  end if;
  if p_price is null or p_price < 0 then
    raise exception 'invalid_price' using errcode = '22023';
  end if;

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
      slug = v_new_slug
    where id = p_product_id;
  exception
    when unique_violation then
      raise exception 'slug_taken' using errcode = '22023';
  end;

  perform public.replace_product_configuration(p_product_id, p_category_ids, p_color_fields);
  perform public.replace_product_personalization_fields(p_product_id, p_personalization_fields);
  perform public.replace_product_wish_templates(p_product_id, p_wish_template_ids);
  perform public.upsert_product_option_groups(p_product_id, p_option_groups);

  return v_previous_image_url;
end;
$$;

revoke all on function public.admin_create_product_v5(
  text, text, text, text, numeric, text, boolean, boolean, text, text, uuid[], jsonb, jsonb, uuid[], jsonb
) from public;
grant execute on function public.admin_create_product_v5(
  text, text, text, text, numeric, text, boolean, boolean, text, text, uuid[], jsonb, jsonb, uuid[], jsonb
) to authenticated;

revoke all on function public.admin_update_product_v5(
  uuid, text, text, text, text, numeric, text, boolean, boolean, text, text, uuid[], jsonb, jsonb, uuid[], jsonb
) from public;
grant execute on function public.admin_update_product_v5(
  uuid, text, text, text, text, numeric, text, boolean, boolean, text, text, uuid[], jsonb, jsonb, uuid[], jsonb
) to authenticated;

-- Backward-compatible wrappers for older app builds still calling v4 RPCs.
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

revoke all on function public.admin_create_product_v4(
  text, text, text, text, numeric, text, boolean, boolean, text, uuid[], jsonb, jsonb, uuid[], jsonb
) from public;
grant execute on function public.admin_create_product_v4(
  text, text, text, text, numeric, text, boolean, boolean, text, uuid[], jsonb, jsonb, uuid[], jsonb
) to authenticated;

-- ---------------------------------------------------------------------------
-- Duplicate product with fresh slug and product code
-- ---------------------------------------------------------------------------

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
begin
  perform public.assert_admin();

  select *
  into v_source
  from public.products
  where id = p_product_id;

  if not found then
    raise exception 'product_not_found' using errcode = 'P0002';
  end if;

  v_next_code := nextval('public.product_code_seq');
  v_new_product_code := 'VM-' || lpad(v_next_code::text, 6, '0');

  for v_attempt in 1..5 loop
    v_new_slug := public.reserve_unique_product_slug(
      coalesce(v_source.slug, public.slugify_product_name(v_source.name)) || '-copy'
    );
    begin
      insert into public.products (
        name,
        description,
        additional_info,
        fulfillment_note,
        price,
        image_url,
        is_customizable,
        is_sold_out,
        card_badge,
        slug,
        product_code
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
        v_source.card_badge,
        v_new_slug,
        v_new_product_code
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

-- ---------------------------------------------------------------------------
-- create_store_order: include productCode and productSlug snapshots
-- Replaces the latest function from universal_product_options.sql with the
-- same validation and idempotency flow, adding slug/code to item snapshots.
-- ---------------------------------------------------------------------------

drop function if exists public.create_store_order(jsonb, jsonb, jsonb, text, uuid);

create or replace function public.create_store_order(
  p_customer jsonb,
  p_delivery jsonb,
  p_items jsonb,
  p_note text,
  p_idempotency_key uuid,
  p_attribution jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item jsonb;
  v_product record;
  v_promo record;
  v_field record;
  v_color record;
  v_color_input jsonb;
  v_product_id uuid;
  v_field_id uuid;
  v_option_id uuid;
  v_quantity integer;
  v_selected_count integer;
  v_personalization text;
  v_items jsonb := '[]'::jsonb;
  v_colors jsonb;
  v_product_names text[] := array[]::text[];
  v_total numeric(10, 2) := 0;
  v_base_unit_price numeric(10, 2);
  v_unit_price numeric(10, 2);
  v_promotion_snapshot jsonb;
  v_option_result jsonb;
  v_option_delta numeric(10, 2);
  v_effective_base numeric(10, 2);
  v_order_id uuid;
  v_request_reserved boolean := false;
  v_customer_name text := trim(coalesce(p_customer ->> 'name', ''));
  v_customer_phone text := regexp_replace(coalesce(p_customer ->> 'phone', ''), '\s+', '', 'g');
  v_customer_email text := nullif(trim(coalesce(p_customer ->> 'email', '')), '');
  v_courier text := p_delivery ->> 'courier';
  v_delivery_type text := p_delivery ->> 'type';
  v_city text := trim(coalesce(p_delivery ->> 'city', ''));
  v_office_or_postcode text := trim(coalesce(p_delivery ->> 'officeOrPostcode', ''));
  v_delivery_details text := trim(coalesce(p_delivery ->> 'details', ''));
  v_order_source text := coalesce(nullif(trim(p_attribution ->> 'source'), ''), 'vemidi-store');
  v_order_campaign text := nullif(left(trim(coalesce(p_attribution ->> 'campaign', '')), 64), '');
  v_order_landing_url text := nullif(left(trim(coalesce(p_attribution ->> 'landingUrl', '')), 240), '');
begin
  if p_idempotency_key is null then
    raise exception 'invalid_idempotency_key' using errcode = '22023';
  end if;

  insert into public.store_order_requests (idempotency_key)
  values (p_idempotency_key)
  on conflict (idempotency_key) do nothing
  returning true into v_request_reserved;

  if not coalesce(v_request_reserved, false) then
    select order_id
      into v_order_id
      from public.store_order_requests
      where idempotency_key = p_idempotency_key;

    if v_order_id is not null then
      return v_order_id;
    end if;

    raise exception 'order_request_in_progress' using errcode = '40001';
  end if;

  if char_length(v_customer_name) < 2 or char_length(v_customer_name) > 120 then
    raise exception 'invalid_customer_name' using errcode = '22023';
  end if;

  if char_length(v_customer_phone) < 6 or char_length(v_customer_phone) > 30 then
    raise exception 'invalid_customer_phone' using errcode = '22023';
  end if;

  if v_customer_email is not null
    and (char_length(v_customer_email) > 160 or v_customer_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') then
    raise exception 'invalid_customer_email' using errcode = '22023';
  end if;

  if v_courier not in ('econt', 'speedy') then
    raise exception 'invalid_courier' using errcode = '22023';
  end if;

  if v_delivery_type not in ('office', 'address') then
    raise exception 'invalid_delivery_type' using errcode = '22023';
  end if;

  if char_length(v_city) < 2 or char_length(v_city) > 120 then
    raise exception 'invalid_city' using errcode = '22023';
  end if;

  if v_delivery_type = 'office' and char_length(v_office_or_postcode) < 2 then
    raise exception 'office_required' using errcode = '22023';
  end if;

  if v_delivery_type = 'address' and char_length(v_delivery_details) < 5 then
    raise exception 'address_required' using errcode = '22023';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'empty_order' using errcode = '22023';
  end if;

  if jsonb_array_length(p_items) > 50 then
    raise exception 'too_many_items' using errcode = '22023';
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    begin
      v_product_id := (v_item ->> 'productId')::uuid;
      v_quantity := (v_item ->> 'quantity')::integer;
    exception
      when others then
        raise exception 'invalid_order_item' using errcode = '22023';
    end;

    if v_quantity < 1 or v_quantity > 99 then
      raise exception 'invalid_quantity' using errcode = '22023';
    end if;

    select id, name, price, is_customizable, is_sold_out, slug, product_code
      into v_product
      from public.products
      where id = v_product_id;

    if not found then
      raise exception 'product_not_found' using errcode = 'P0002';
    end if;

    if coalesce(v_product.is_sold_out, false) then
      raise exception 'product_sold_out' using errcode = '22023';
    end if;

    if v_product.price is null or v_product.price < 0 then
      raise exception 'invalid_product_price' using errcode = '22023';
    end if;

    v_base_unit_price := v_product.price;

    v_option_result := public.validate_product_option_selections(
      v_product_id,
      coalesce(v_item -> 'optionSelections', '[]'::jsonb)
    );

    v_effective_base := (v_option_result ->> 'effectiveBasePrice')::numeric;
    v_option_delta := (v_option_result ->> 'optionDelta')::numeric;
    v_unit_price := (v_option_result ->> 'unitPrice')::numeric;
    v_promotion_snapshot := v_option_result -> 'promotion';

    v_personalization := nullif(trim(coalesce(v_item ->> 'personalization', '')), '');
    if char_length(coalesce(v_personalization, '')) > 1000 then
      raise exception 'personalization_too_long' using errcode = '22023';
    end if;

    if not v_product.is_customizable and v_personalization is not null then
      raise exception 'product_not_customizable' using errcode = '22023';
    end if;

    if v_item ? 'selectedColors' and jsonb_typeof(v_item -> 'selectedColors') <> 'array' then
      raise exception 'invalid_color_selection' using errcode = '22023';
    end if;

    for v_field in
      select id, min_select, max_select
      from public.product_color_fields
      where product_id = v_product_id and enabled = true
    loop
      select count(distinct selected ->> 'optionId')
        into v_selected_count
        from jsonb_array_elements(coalesce(v_item -> 'selectedColors', '[]'::jsonb))
          as choices(selected)
        where selected ->> 'fieldId' = v_field.id::text;

      if v_selected_count < v_field.min_select or v_selected_count > v_field.max_select then
        raise exception 'invalid_color_count' using errcode = '22023';
      end if;
    end loop;

    v_colors := '[]'::jsonb;
    for v_color_input in
      select selected
      from jsonb_array_elements(coalesce(v_item -> 'selectedColors', '[]'::jsonb))
        as choices(selected)
    loop
      begin
        v_field_id := (v_color_input ->> 'fieldId')::uuid;
        v_option_id := (v_color_input ->> 'optionId')::uuid;
      exception
        when others then
          raise exception 'invalid_color_selection' using errcode = '22023';
      end;

      select
        field.label as field_label,
        color_group.id as group_id,
        color_group.key as group_key,
        color_group.label as group_label,
        color_option.id as option_id,
        color_option.name as option_name,
        color_option.hex as option_hex
      into v_color
      from public.product_color_fields field
      join public.product_color_field_options allowed
        on allowed.field_id = field.id
      join public.color_options color_option
        on color_option.id = allowed.color_option_id
       and color_option.is_active = true
      join public.color_groups color_group
        on color_group.id = field.group_id
       and color_group.id = color_option.group_id
      where field.id = v_field_id
        and field.product_id = v_product_id
        and field.enabled = true
        and color_option.id = v_option_id;

      if not found then
        raise exception 'invalid_color_selection' using errcode = '22023';
      end if;

      v_colors := v_colors || jsonb_build_array(
        jsonb_build_object(
          'fieldId', v_field_id,
          'fieldLabel', v_color.field_label,
          'groupId', v_color.group_id,
          'groupKey', v_color.group_key,
          'groupLabel', v_color.group_label,
          'optionId', v_color.option_id,
          'optionName', v_color.option_name,
          'optionHex', v_color.option_hex
        )
      );
    end loop;

    v_total := v_total + (v_unit_price * v_quantity);
    v_product_names := array_append(v_product_names, v_product.name);
    v_items := v_items || jsonb_build_array(
      jsonb_build_object(
        'productId', v_product.id,
        'productCode', v_product.product_code,
        'productSlug', v_product.slug,
        'name', v_product.name,
        'baseUnitPrice', v_base_unit_price,
        'effectiveBasePrice', v_effective_base,
        'optionDelta', v_option_delta,
        'unitPrice', v_unit_price,
        'promotion', v_promotion_snapshot,
        'quantity', v_quantity,
        'lineTotal', v_unit_price * v_quantity,
        'personalization', v_personalization,
        'personalizationFields', coalesce(v_item -> 'personalizationFields', '[]'::jsonb),
        'selectedColors', v_colors,
        'optionSelections', v_option_result -> 'optionSelections'
      )
    );
  end loop;

  insert into public.orders (
    status,
    product_name,
    total_price,
    currency,
    customer_name,
    customer_phone,
    customer_email,
    courier,
    delivery_type,
    city,
    delivery_details,
    office_name,
    payment_method,
    note,
    raw_payload
  )
  values (
    'new',
    array_to_string(v_product_names, ', '),
    v_total,
    'EUR',
    v_customer_name,
    v_customer_phone,
    v_customer_email,
    v_courier,
    v_delivery_type,
    v_city,
    case
      when v_delivery_type = 'address' then v_delivery_details
      else nullif(v_office_or_postcode, '')
    end,
    case
      when v_delivery_type = 'office' then nullif(v_office_or_postcode, '')
      else null
    end,
    'cash_on_delivery',
    nullif(left(trim(coalesce(p_note, '')), 1000), ''),
    jsonb_build_object(
      'source', v_order_source,
      'campaign', v_order_campaign,
      'landingUrl', v_order_landing_url,
      'customer', jsonb_build_object(
        'name', v_customer_name,
        'phone', v_customer_phone,
        'email', v_customer_email
      ),
      'delivery', jsonb_build_object(
        'courier', v_courier,
        'type', v_delivery_type,
        'city', v_city,
        'officeOrPostcode', nullif(v_office_or_postcode, ''),
        'details', nullif(v_delivery_details, '')
      ),
      'order', jsonb_build_object(
        'items', v_items,
        'totalPrice', v_total,
        'currency', 'EUR',
        'paymentMethod', 'cash_on_delivery',
        'idempotencyKey', p_idempotency_key
      )
    )
  )
  returning id into v_order_id;

  update public.store_order_requests
  set order_id = v_order_id
  where idempotency_key = p_idempotency_key;

  return v_order_id;
end;
$$;

revoke all on function public.create_store_order(jsonb, jsonb, jsonb, text, uuid, jsonb) from public;
revoke all on function public.create_store_order(jsonb, jsonb, jsonb, text, uuid, jsonb) from anon;
revoke all on function public.create_store_order(jsonb, jsonb, jsonb, text, uuid, jsonb) from authenticated;
grant execute on function public.create_store_order(jsonb, jsonb, jsonb, text, uuid, jsonb) to service_role;

revoke all on function public.admin_duplicate_product(uuid) from public;
grant execute on function public.admin_duplicate_product(uuid) to authenticated;

commit;
