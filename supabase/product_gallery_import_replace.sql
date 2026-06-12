-- Import gallery rows with explicit order/primary metadata (duplicate copy).
-- Replace a single gallery image URL after a new file is uploaded in Storage.

create or replace function public.admin_import_product_images(
  p_product_id uuid,
  p_images jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_image jsonb;
  v_primary_url text := null;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  if not exists (select 1 from public.products where id = p_product_id) then
    raise exception 'product_not_found' using errcode = 'P0002';
  end if;

  for v_image in select value from jsonb_array_elements(coalesce(p_images, '[]'::jsonb))
  loop
    if nullif(btrim(v_image ->> 'image_url'), '') is null then
      raise exception 'invalid_product_image' using errcode = '22023';
    end if;

    insert into public.product_images (
      product_id,
      image_url,
      alt_text,
      sort_order,
      is_primary
    )
    values (
      p_product_id,
      btrim(v_image ->> 'image_url'),
      nullif(btrim(v_image ->> 'alt_text'), ''),
      coalesce((v_image ->> 'sort_order')::integer, 0),
      coalesce((v_image ->> 'is_primary')::boolean, false)
    );

    if coalesce((v_image ->> 'is_primary')::boolean, false) then
      v_primary_url := btrim(v_image ->> 'image_url');
    end if;
  end loop;

  if v_primary_url is not null then
    update public.products
    set image_url = v_primary_url
    where id = p_product_id;
  end if;
end;
$$;

create or replace function public.admin_replace_product_gallery_image(
  p_image_id uuid,
  p_image_url text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_old public.product_images%rowtype;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  if nullif(btrim(p_image_url), '') is null then
    raise exception 'invalid_product_image' using errcode = '22023';
  end if;

  select *
    into v_old
    from public.product_images
    where id = p_image_id
    for update;

  if not found then
    raise exception 'product_image_not_found' using errcode = 'P0002';
  end if;

  update public.product_images
  set image_url = btrim(p_image_url)
  where id = p_image_id;

  if v_old.is_primary then
    update public.products
    set image_url = btrim(p_image_url)
    where id = v_old.product_id;
  end if;

  return jsonb_build_object(
    'product_id', v_old.product_id,
    'old_image_url', v_old.image_url,
    'is_primary', v_old.is_primary
  );
end;
$$;

revoke all on function public.admin_import_product_images(uuid, jsonb) from public;
revoke all on function public.admin_replace_product_gallery_image(uuid, text) from public;

grant execute on function public.admin_import_product_images(uuid, jsonb) to authenticated;
grant execute on function public.admin_replace_product_gallery_image(uuid, text) to authenticated;
