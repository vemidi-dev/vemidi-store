-- Product galleries with a single ordered primary image.
-- Existing products.image_url values are preserved and backfilled.

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  alt_text text,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  constraint product_images_url_check check (nullif(btrim(image_url), '') is not null)
);

create index if not exists product_images_product_order_idx
  on public.product_images(product_id, sort_order, created_at);

create unique index if not exists product_images_one_primary_idx
  on public.product_images(product_id)
  where is_primary;

insert into public.product_images (
  product_id,
  image_url,
  alt_text,
  sort_order,
  is_primary
)
select
  product.id,
  product.image_url,
  product.name,
  0,
  true
from public.products product
where nullif(btrim(product.image_url), '') is not null
  and not exists (
    select 1
    from public.product_images image
    where image.product_id = product.id
  );

alter table public.product_images enable row level security;

grant select on public.product_images to anon, authenticated;
grant insert, update, delete on public.product_images to authenticated;

drop policy if exists "product_images_gallery_public_read" on public.product_images;
create policy "product_images_gallery_public_read"
on public.product_images
for select
to anon, authenticated
using (true);

drop policy if exists "product_images_gallery_admin_write" on public.product_images;
create policy "product_images_gallery_admin_write"
on public.product_images
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create or replace function public.admin_attach_product_images(
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
  v_next_order integer;
  v_has_primary boolean;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  if not exists (select 1 from public.products where id = p_product_id) then
    raise exception 'product_not_found' using errcode = 'P0002';
  end if;

  select coalesce(max(sort_order), -1) + 1
    into v_next_order
    from public.product_images
    where product_id = p_product_id;

  select exists (
    select 1
    from public.product_images
    where product_id = p_product_id and is_primary
  ) into v_has_primary;

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
      v_next_order,
      not v_has_primary
    );

    if not v_has_primary then
      update public.products
      set image_url = btrim(v_image ->> 'image_url')
      where id = p_product_id;
      v_has_primary := true;
    end if;

    v_next_order := v_next_order + 1;
  end loop;
end;
$$;

create or replace function public.admin_set_primary_product_image(
  p_image_id uuid
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_image public.product_images%rowtype;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  select *
    into v_image
    from public.product_images
    where id = p_image_id
    for update;

  if not found then
    raise exception 'product_image_not_found' using errcode = 'P0002';
  end if;

  update public.product_images
  set is_primary = false
  where product_id = v_image.product_id and is_primary;

  update public.product_images
  set is_primary = true
  where id = v_image.id;

  update public.products
  set image_url = v_image.image_url
  where id = v_image.product_id;
end;
$$;

create or replace function public.admin_move_product_image(
  p_image_id uuid,
  p_direction text
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_current public.product_images%rowtype;
  v_neighbor public.product_images%rowtype;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if p_direction not in ('up', 'down') then
    raise exception 'invalid_direction' using errcode = '22023';
  end if;

  select *
    into v_current
    from public.product_images
    where id = p_image_id
    for update;

  if not found then
    raise exception 'product_image_not_found' using errcode = 'P0002';
  end if;

  if p_direction = 'up' then
    select *
      into v_neighbor
      from public.product_images
      where product_id = v_current.product_id
        and id <> v_current.id
        and sort_order < v_current.sort_order
      order by sort_order desc, created_at desc, id desc
      limit 1
      for update;
  else
    select *
      into v_neighbor
      from public.product_images
      where product_id = v_current.product_id
        and id <> v_current.id
        and sort_order > v_current.sort_order
      order by sort_order asc, created_at asc, id asc
      limit 1
      for update;
  end if;

  if not found then
    return false;
  end if;

  update public.product_images
  set sort_order = case
    when id = v_current.id then v_neighbor.sort_order
    when id = v_neighbor.id then v_current.sort_order
  end
  where id in (v_current.id, v_neighbor.id);

  return true;
end;
$$;

create or replace function public.admin_delete_product_gallery_image(
  p_image_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_deleted public.product_images%rowtype;
  v_new_primary public.product_images%rowtype;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  delete from public.product_images
  where id = p_image_id
  returning * into v_deleted;

  if not found then
    raise exception 'product_image_not_found' using errcode = 'P0002';
  end if;

  if v_deleted.is_primary then
    select *
      into v_new_primary
      from public.product_images
      where product_id = v_deleted.product_id
      order by sort_order, created_at, id
      limit 1
      for update;

    if found then
      update public.product_images
      set is_primary = true
      where id = v_new_primary.id;

      update public.products
      set image_url = v_new_primary.image_url
      where id = v_deleted.product_id;
    else
      update public.products
      set image_url = null
      where id = v_deleted.product_id;
    end if;
  end if;

  return jsonb_build_object(
    'product_id', v_deleted.product_id,
    'image_url', v_deleted.image_url
  );
end;
$$;

revoke all on function public.admin_attach_product_images(uuid, jsonb) from public;
revoke all on function public.admin_set_primary_product_image(uuid) from public;
revoke all on function public.admin_move_product_image(uuid, text) from public;
revoke all on function public.admin_delete_product_gallery_image(uuid) from public;

grant execute on function public.admin_attach_product_images(uuid, jsonb) to authenticated;
grant execute on function public.admin_set_primary_product_image(uuid) to authenticated;
grant execute on function public.admin_move_product_image(uuid, text) to authenticated;
grant execute on function public.admin_delete_product_gallery_image(uuid) to authenticated;
