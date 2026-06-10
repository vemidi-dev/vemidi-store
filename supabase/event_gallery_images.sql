-- Flat gallery of photos from past workshops/events.
-- Images live in the product-images bucket under events/gallery/.

create table if not exists public.event_gallery_images (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  alt_text text,
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  constraint event_gallery_images_url_check check (nullif(btrim(image_url), '') is not null)
);

create index if not exists event_gallery_images_order_idx
  on public.event_gallery_images (is_published, sort_order, created_at);

alter table public.event_gallery_images enable row level security;

grant select on public.event_gallery_images to anon, authenticated;
grant insert, update, delete on public.event_gallery_images to authenticated;

drop policy if exists "event_gallery_images_public_read" on public.event_gallery_images;
create policy "event_gallery_images_public_read"
on public.event_gallery_images
for select
to anon, authenticated
using (is_published = true);

drop policy if exists "event_gallery_images_admin_read" on public.event_gallery_images;
create policy "event_gallery_images_admin_read"
on public.event_gallery_images
for select
to authenticated
using (public.is_admin(auth.uid()));

drop policy if exists "event_gallery_images_admin_write" on public.event_gallery_images;
create policy "event_gallery_images_admin_write"
on public.event_gallery_images
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create or replace function public.admin_attach_event_gallery_images(
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
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  select coalesce(max(sort_order), -1) + 1
    into v_next_order
    from public.event_gallery_images;

  for v_image in select value from jsonb_array_elements(coalesce(p_images, '[]'::jsonb))
  loop
    if nullif(btrim(v_image ->> 'image_url'), '') is null then
      raise exception 'invalid_event_gallery_image' using errcode = '22023';
    end if;

    insert into public.event_gallery_images (
      image_url,
      alt_text,
      sort_order,
      is_published
    )
    values (
      btrim(v_image ->> 'image_url'),
      nullif(btrim(v_image ->> 'alt_text'), ''),
      v_next_order,
      coalesce((v_image ->> 'is_published')::boolean, true)
    );

    v_next_order := v_next_order + 1;
  end loop;
end;
$$;

create or replace function public.admin_move_event_gallery_image(
  p_image_id uuid,
  p_direction text
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_current public.event_gallery_images%rowtype;
  v_neighbor public.event_gallery_images%rowtype;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if p_direction not in ('up', 'down') then
    raise exception 'invalid_direction' using errcode = '22023';
  end if;

  select *
    into v_current
    from public.event_gallery_images
    where id = p_image_id
    for update;

  if not found then
    raise exception 'event_gallery_image_not_found' using errcode = 'P0002';
  end if;

  if p_direction = 'up' then
    select *
      into v_neighbor
      from public.event_gallery_images
      where id <> v_current.id
        and sort_order < v_current.sort_order
      order by sort_order desc, created_at desc, id desc
      limit 1
      for update;
  else
    select *
      into v_neighbor
      from public.event_gallery_images
      where id <> v_current.id
        and sort_order > v_current.sort_order
      order by sort_order asc, created_at asc, id asc
      limit 1
      for update;
  end if;

  if not found then
    return false;
  end if;

  update public.event_gallery_images
  set sort_order = case
    when id = v_current.id then v_neighbor.sort_order
    when id = v_neighbor.id then v_current.sort_order
  end
  where id in (v_current.id, v_neighbor.id);

  return true;
end;
$$;

create or replace function public.admin_delete_event_gallery_image(
  p_image_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_deleted public.event_gallery_images%rowtype;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  delete from public.event_gallery_images
  where id = p_image_id
  returning * into v_deleted;

  if not found then
    raise exception 'event_gallery_image_not_found' using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'id', v_deleted.id,
    'image_url', v_deleted.image_url
  );
end;
$$;

revoke all on function public.admin_attach_event_gallery_images(jsonb) from public;
revoke all on function public.admin_move_event_gallery_image(uuid, text) from public;
revoke all on function public.admin_delete_event_gallery_image(uuid) from public;

grant execute on function public.admin_attach_event_gallery_images(jsonb) to authenticated;
grant execute on function public.admin_move_event_gallery_image(uuid, text) to authenticated;
grant execute on function public.admin_delete_event_gallery_image(uuid) to authenticated;
