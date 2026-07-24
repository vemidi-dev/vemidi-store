-- Allow products to use either a product category or a material category
-- as their primary category.

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
      and category_type in ('product', 'material')
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
    and category_type in ('product', 'material');

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
