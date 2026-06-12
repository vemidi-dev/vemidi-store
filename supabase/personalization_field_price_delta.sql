-- Add an optional surcharge to legacy personalization fields.
-- Run after universal_product_options.sql.

alter table public.product_personalization_fields
  add column if not exists price_delta numeric(10, 2) not null default 0;

alter table public.product_personalization_fields
  drop constraint if exists product_personalization_fields_price_delta_check;

alter table public.product_personalization_fields
  add constraint product_personalization_fields_price_delta_check
  check (price_delta >= 0);

create or replace function public.replace_product_personalization_fields(
  p_product_id uuid,
  p_fields jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_field record;
  v_keys text[] := array[]::text[];
begin
  perform public.assert_admin();

  delete from public.product_personalization_fields
  where product_id = p_product_id;

  for v_field in
    select *
    from jsonb_to_recordset(coalesce(p_fields, '[]'::jsonb)) as field(
      label text,
      field_key text,
      field_type text,
      placeholder text,
      max_length integer,
      price_delta numeric,
      is_required boolean,
      allows_wish_templates boolean,
      sort_order integer
    )
  loop
    if
      nullif(btrim(v_field.label), '') is null
      or v_field.field_key !~ '^[a-z][a-z0-9_]{0,63}$'
      or v_field.field_type not in ('text', 'textarea', 'date')
      or v_field.max_length < 1
      or v_field.max_length > 1000
      or coalesce(v_field.price_delta, 0) < 0
      or v_field.field_key = any(v_keys)
    then
      raise exception 'invalid_personalization_field' using errcode = '22023';
    end if;

    v_keys := array_append(v_keys, v_field.field_key);

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
    values (
      p_product_id,
      btrim(v_field.label),
      v_field.field_key,
      v_field.field_type,
      nullif(btrim(v_field.placeholder), ''),
      v_field.max_length,
      coalesce(v_field.price_delta, 0),
      coalesce(v_field.is_required, false),
      coalesce(v_field.allows_wish_templates, false),
      coalesce(v_field.sort_order, 0)
    );
  end loop;
end;
$$;

create or replace function public.apply_personalization_field_pricing()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_items jsonb;
  v_item jsonb;
  v_item_index integer;
  v_product_id uuid;
  v_quantity integer;
  v_delta numeric(10, 2);
  v_unit_price numeric(10, 2);
  v_line_total numeric(10, 2);
  v_total numeric(10, 2) := 0;
begin
  v_items := new.raw_payload #> '{order,items}';

  if jsonb_typeof(v_items) <> 'array' then
    return new;
  end if;

  if jsonb_array_length(v_items) = 0 then
    return new;
  end if;

  for v_item_index in 0..jsonb_array_length(v_items) - 1
  loop
    v_item := v_items -> v_item_index;

    if
      not (v_item ? 'productId')
      or not (v_item ? 'unitPrice')
      or not (v_item ? 'quantity')
    then
      return new;
    end if;

    begin
      v_product_id := (v_item ->> 'productId')::uuid;
      v_quantity := greatest(1, (v_item ->> 'quantity')::integer);
      v_unit_price := coalesce((v_item ->> 'unitPrice')::numeric, 0);
    exception
      when others then
        return new;
    end;

    select coalesce(sum(field.price_delta), 0)
      into v_delta
      from jsonb_array_elements(
        case
          when jsonb_typeof(v_item -> 'personalizationFields') = 'array'
            then v_item -> 'personalizationFields'
          else '[]'::jsonb
        end
      ) as submitted(value)
      join public.product_personalization_fields field
        on field.id::text = submitted.value ->> 'fieldId'
       and field.product_id = v_product_id
      where nullif(btrim(coalesce(submitted.value ->> 'value', '')), '') is not null;

    v_unit_price := v_unit_price + v_delta;
    v_line_total := v_unit_price * v_quantity;
    v_total := v_total + v_line_total;

    v_item := jsonb_set(v_item, '{personalizationDelta}', to_jsonb(v_delta), true);
    v_item := jsonb_set(v_item, '{unitPrice}', to_jsonb(v_unit_price), true);
    v_item := jsonb_set(v_item, '{lineTotal}', to_jsonb(v_line_total), true);
    v_items := jsonb_set(v_items, array[v_item_index::text], v_item, false);
  end loop;

  new.total_price := v_total;
  new.raw_payload := jsonb_set(new.raw_payload, '{order,items}', v_items, false);
  new.raw_payload := jsonb_set(
    new.raw_payload,
    '{order,totalPrice}',
    to_jsonb(v_total),
    true
  );

  return new;
end;
$$;

drop trigger if exists apply_personalization_field_pricing_before_insert
  on public.orders;

create trigger apply_personalization_field_pricing_before_insert
before insert on public.orders
for each row
execute function public.apply_personalization_field_pricing();
