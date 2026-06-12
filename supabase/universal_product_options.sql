-- Universal product options: groups, values, server-side pricing, atomic admin save.
-- Run after campaign_order_attribution.sql (latest create_store_order + attribution).
-- Safe for existing data; idempotent where possible. Do not execute automatically from the app.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.product_option_groups (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  key text not null,
  input_type text not null,
  is_required boolean not null default false,
  min_select integer not null default 0,
  max_select integer not null default 1,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  pricing_mode text not null default 'delta',
  depends_on_option_id uuid,
  placeholder text,
  max_length integer,
  text_price_delta numeric(10, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_option_groups_input_type_check check (
    input_type in ('single', 'multiple', 'text', 'textarea', 'date')
  ),
  constraint product_option_groups_pricing_mode_check check (
    pricing_mode in ('delta')
  ),
  constraint product_option_groups_min_select_check check (min_select >= 0),
  constraint product_option_groups_max_select_check check (max_select >= 0),
  constraint product_option_groups_min_max_check check (min_select <= max_select),
  constraint product_option_groups_text_price_delta_check check (text_price_delta >= 0),
  constraint product_option_groups_max_length_check check (
    max_length is null or (max_length >= 1 and max_length <= 1000)
  ),
  constraint product_option_groups_product_key_unique unique (product_id, key)
);

create table if not exists public.product_option_values (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.product_option_groups(id) on delete cascade,
  label text not null,
  key text not null,
  price_delta numeric(10, 2) not null default 0,
  is_default boolean not null default false,
  is_active boolean not null default true,
  is_sold_out boolean not null default false,
  sku text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_option_values_price_delta_check check (price_delta >= 0),
  constraint product_option_values_group_key_unique unique (group_id, key)
);

-- FK for conditional display (added after values table exists)
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'product_option_groups_depends_on_option_id_fkey'
  ) then
    alter table public.product_option_groups
      add constraint product_option_groups_depends_on_option_id_fkey
      foreign key (depends_on_option_id)
      references public.product_option_values(id)
      on delete set null;
  end if;
end $$;

create index if not exists product_option_groups_product_active_idx
  on public.product_option_groups (product_id, is_active, sort_order);

create index if not exists product_option_values_group_active_idx
  on public.product_option_values (group_id, is_active, sort_order);

-- ---------------------------------------------------------------------------
-- Grants (storefront read + admin write via RLS)
-- ---------------------------------------------------------------------------

grant select on public.product_option_groups to anon, authenticated;
grant select on public.product_option_values to anon, authenticated;
grant insert, update, delete on public.product_option_groups to authenticated;
grant insert, update, delete on public.product_option_values to authenticated;

alter table public.product_option_groups enable row level security;
alter table public.product_option_values enable row level security;

drop policy if exists "product_option_groups_read_public" on public.product_option_groups;
create policy "product_option_groups_read_public"
on public.product_option_groups
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "product_option_groups_admin_all" on public.product_option_groups;
create policy "product_option_groups_admin_all"
on public.product_option_groups
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "product_option_values_read_public" on public.product_option_values;
create policy "product_option_values_read_public"
on public.product_option_values
for select
to anon, authenticated
using (
  is_active = true
  and exists (
    select 1
    from public.product_option_groups grp
    where grp.id = group_id
      and grp.is_active = true
  )
);

drop policy if exists "product_option_values_admin_all" on public.product_option_values;
create policy "product_option_values_admin_all"
on public.product_option_values
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- Helper: detect dependency cycles among groups (simple parent walk)
-- ---------------------------------------------------------------------------

create or replace function public._option_group_dependency_parent(
  p_group_id uuid
)
returns uuid
language sql
stable
set search_path = ''
as $$
  select grp.id
  from public.product_option_groups child
  join public.product_option_values dep_val on dep_val.id = child.depends_on_option_id
  join public.product_option_groups grp on grp.id = dep_val.group_id
  where child.id = p_group_id;
$$;

-- ---------------------------------------------------------------------------
-- Upsert product option groups (preserves UUIDs; no blind delete/reinsert)
-- ---------------------------------------------------------------------------

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
begin
  perform public.assert_admin();

  for v_group in
    select value from jsonb_array_elements(coalesce(p_groups, '[]'::jsonb))
  loop
    v_input_type := coalesce(v_group ->> 'input_type', '');

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

  -- Cycle detection on payload + existing groups for this product
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

  -- Remove groups omitted from payload
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
        updated_at = now()
      where id = v_group_id;
    else
      insert into public.product_option_groups (
        product_id, name, key, input_type, is_required, min_select, max_select,
        sort_order, is_active, pricing_mode, depends_on_option_id,
        placeholder, max_length, text_price_delta
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
        coalesce((v_group ->> 'text_price_delta')::numeric, 0)
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
            sku = nullif(btrim(v_value ->> 'sku'), ''),
            sort_order = coalesce((v_value ->> 'sort_order')::integer, 0),
            updated_at = now()
          where id = v_value_id;
        else
          insert into public.product_option_values (
            group_id, label, key, price_delta, is_default, is_active,
            is_sold_out, sku, sort_order
          )
          values (
            v_group_id,
            btrim(v_value ->> 'label'),
            btrim(v_value ->> 'key'),
            coalesce((v_value ->> 'price_delta')::numeric, 0),
            coalesce((v_value ->> 'is_default')::boolean, false),
            coalesce((v_value ->> 'is_active')::boolean, true),
            coalesce((v_value ->> 'is_sold_out')::boolean, false),
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

  -- Validate the final persisted dependency graph. The earlier check only sees
  -- the state before this payload is applied.
  for v_group_id in
    select id from public.product_option_groups where product_id = p_product_id
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

-- ---------------------------------------------------------------------------
-- Validate selections and compute pricing snapshot (authoritative server-side)
-- ---------------------------------------------------------------------------

create or replace function public.validate_product_option_selections(
  p_product_id uuid,
  p_selections jsonb
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_sel jsonb;
  v_group record;
  v_value record;
  v_group_id uuid;
  v_value_id uuid;
  v_text text;
  v_seen_groups uuid[] := array[]::uuid[];
  v_value_ids jsonb;
  v_count integer;
  v_option_delta numeric(10, 2) := 0;
  v_group_delta numeric(10, 2);
  v_base_price numeric(10, 2);
  v_effective_base numeric(10, 2);
  v_unit_price numeric(10, 2);
  v_promo record;
  v_promotion_snapshot jsonb;
  v_groups_snapshot jsonb := '[]'::jsonb;
  v_values_snapshot jsonb;
  v_dep_satisfied boolean;
  v_selected_value_ids uuid[] := array[]::uuid[];
  v_all_groups record;
begin
  if jsonb_typeof(p_selections) <> 'array' then
    raise exception 'invalid_option_selections' using errcode = '22023';
  end if;

  select price into v_base_price
  from public.products
  where id = p_product_id;

  if not found or v_base_price is null then
    raise exception 'product_not_found' using errcode = 'P0002';
  end if;

  v_effective_base := public.resolve_product_unit_price(p_product_id);
  v_promotion_snapshot := null;

  if v_effective_base < v_base_price then
    select promo.id, promo.name, promo.discount_type, promo.discount_value, promo.ends_at
      into v_promo
      from public.product_promotions promo
      where promo.product_id = p_product_id
        and promo.is_active = true
        and promo.starts_at <= now()
        and promo.ends_at > now()
      order by promo.created_at desc
      limit 1;

    if found then
      v_promotion_snapshot := jsonb_build_object(
        'id', v_promo.id,
        'name', v_promo.name,
        'discountType', v_promo.discount_type,
        'discountValue', v_promo.discount_value,
        'endsAt', v_promo.ends_at,
        'baseUnitPrice', v_base_price
      );
    end if;
  end if;

  -- Collect all submitted value ids for dependency checks
  for v_sel in select value from jsonb_array_elements(p_selections)
  loop
    for v_value_id in
      select (val #>> '{}')::uuid
      from jsonb_array_elements_text(coalesce(v_sel -> 'valueIds', '[]'::jsonb)) as vals(val)
    loop
      v_selected_value_ids := array_append(v_selected_value_ids, v_value_id);
    end loop;
  end loop;

  -- Validate each submitted selection
  for v_sel in select value from jsonb_array_elements(p_selections)
  loop
    begin
      v_group_id := (v_sel ->> 'groupId')::uuid;
    exception
      when others then
        raise exception 'invalid_option_group_id' using errcode = '22023';
    end;

    if v_group_id = any(v_seen_groups) then
      raise exception 'duplicate_option_group' using errcode = '22023';
    end if;
    v_seen_groups := array_append(v_seen_groups, v_group_id);

    select *
      into v_group
      from public.product_option_groups
      where id = v_group_id
        and product_id = p_product_id
        and is_active = true;

    if not found then
      raise exception 'invalid_option_group' using errcode = '22023';
    end if;

    v_dep_satisfied := true;
    if v_group.depends_on_option_id is not null then
      v_dep_satisfied := v_group.depends_on_option_id = any(v_selected_value_ids);
      if not v_dep_satisfied then
        raise exception 'option_dependency_not_met' using errcode = '22023';
      end if;
    end if;

    v_text := nullif(trim(coalesce(v_sel ->> 'textValue', '')), '');
    v_value_ids := coalesce(v_sel -> 'valueIds', '[]'::jsonb);

    if v_group.input_type in ('text', 'textarea', 'date') then
      if jsonb_array_length(v_value_ids) > 0 then
        raise exception 'invalid_option_text_values' using errcode = '22023';
      end if;

      if v_group.is_required and v_text is null then
        raise exception 'required_option_missing' using errcode = '22023';
      end if;

      if v_text is not null then
        if char_length(v_text) > coalesce(v_group.max_length, 1000) then
          raise exception 'option_text_too_long' using errcode = '22023';
        end if;

        if v_group.input_type = 'date' then
          if v_text !~ '^\d{4}-\d{2}-\d{2}$'
            or to_char(to_date(v_text, 'YYYY-MM-DD'), 'YYYY-MM-DD') <> v_text
          then
            raise exception 'invalid_option_date' using errcode = '22023';
          end if;
        end if;

        v_group_delta := coalesce(v_group.text_price_delta, 0);
        v_option_delta := v_option_delta + v_group_delta;

        v_groups_snapshot := v_groups_snapshot || jsonb_build_array(
          jsonb_build_object(
            'groupId', v_group.id,
            'groupName', v_group.name,
            'groupKey', v_group.key,
            'inputType', v_group.input_type,
            'textValue', v_text,
            'values', '[]'::jsonb,
            'groupPriceDelta', v_group_delta
          )
        );
      end if;

      continue;
    end if;

    v_count := jsonb_array_length(v_value_ids);

    if v_count <> (
      select count(distinct val)
      from jsonb_array_elements_text(v_value_ids) as vals(val)
    ) then
      raise exception 'duplicate_option_value' using errcode = '22023';
    end if;

    if v_count < v_group.min_select or v_count > v_group.max_select then
      raise exception 'invalid_option_count' using errcode = '22023';
    end if;

    if v_group.is_required and v_count = 0 then
      raise exception 'required_option_missing' using errcode = '22023';
    end if;

    v_values_snapshot := '[]'::jsonb;
    v_group_delta := 0;

    for v_value_id in
      select distinct (val #>> '{}')::uuid
      from jsonb_array_elements_text(v_value_ids) as vals(val)
    loop
      select *
        into v_value
        from public.product_option_values val
        join public.product_option_groups grp on grp.id = val.group_id
        where val.id = v_value_id
          and val.group_id = v_group_id
          and grp.product_id = p_product_id
          and val.is_active = true
          and grp.is_active = true;

      if not found then
        raise exception 'invalid_option_value' using errcode = '22023';
      end if;

      if v_value.is_sold_out then
        raise exception 'option_value_sold_out' using errcode = '22023';
      end if;

      v_group_delta := v_group_delta + coalesce(v_value.price_delta, 0);

      v_values_snapshot := v_values_snapshot || jsonb_build_array(
        jsonb_build_object(
          'valueId', v_value.id,
          'label', v_value.label,
          'key', v_value.key,
          'priceDelta', v_value.price_delta,
          'sku', v_value.sku
        )
      );
    end loop;

    v_option_delta := v_option_delta + v_group_delta;

    if v_count > 0 then
      v_groups_snapshot := v_groups_snapshot || jsonb_build_array(
        jsonb_build_object(
          'groupId', v_group.id,
          'groupName', v_group.name,
          'groupKey', v_group.key,
          'inputType', v_group.input_type,
          'textValue', null,
          'values', v_values_snapshot,
          'groupPriceDelta', v_group_delta
        )
      );
    end if;
  end loop;

  -- Required visible groups not submitted
  for v_all_groups in
    select *
    from public.product_option_groups
    where product_id = p_product_id
      and is_active = true
      and is_required = true
  loop
    if v_all_groups.id = any(v_seen_groups) then
      continue;
    end if;

    v_dep_satisfied := true;
    if v_all_groups.depends_on_option_id is not null then
      v_dep_satisfied := v_all_groups.depends_on_option_id = any(v_selected_value_ids);
    end if;

    if v_dep_satisfied then
      raise exception 'required_option_missing' using errcode = '22023';
    end if;
  end loop;

  v_unit_price := greatest(v_effective_base + v_option_delta, 0);

  return jsonb_build_object(
    'baseUnitPrice', v_base_price,
    'effectiveBasePrice', v_effective_base,
    'optionDelta', v_option_delta,
    'unitPrice', v_unit_price,
    'promotion', v_promotion_snapshot,
    'optionSelections', v_groups_snapshot
  );
end;
$$;

revoke all on function public.validate_product_option_selections(uuid, jsonb) from public;
grant execute on function public.validate_product_option_selections(uuid, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- Admin product RPC v4 (extends v3 with option groups)
-- ---------------------------------------------------------------------------

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
  perform public.upsert_product_option_groups(v_product_id, p_option_groups);

  return v_product_id;
end;
$$;

create or replace function public.admin_update_product_v4(
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
  perform public.upsert_product_option_groups(p_product_id, p_option_groups);

  return v_previous_image_url;
end;
$$;

revoke all on function public.admin_create_product_v4(
  text, text, text, text, numeric, text, boolean, boolean, text, uuid[], jsonb, jsonb, uuid[], jsonb
) from public;
grant execute on function public.admin_create_product_v4(
  text, text, text, text, numeric, text, boolean, boolean, text, uuid[], jsonb, jsonb, uuid[], jsonb
) to authenticated;

revoke all on function public.admin_update_product_v4(
  uuid, text, text, text, text, numeric, text, boolean, boolean, text, uuid[], jsonb, jsonb, uuid[], jsonb
) from public;
grant execute on function public.admin_update_product_v4(
  uuid, text, text, text, text, numeric, text, boolean, boolean, text, uuid[], jsonb, jsonb, uuid[], jsonb
) to authenticated;

-- ---------------------------------------------------------------------------
-- create_store_order: extend with universal option validation and snapshot
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

    select id, name, price, is_customizable, is_sold_out
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

    -- Universal options: authoritative pricing (ignores any client price fields)
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
