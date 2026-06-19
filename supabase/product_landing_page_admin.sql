-- Admin RPC for product landing pages.
-- Run after product_landing_pages.sql. Do not execute automatically from the app.
-- Safe to re-run: CREATE OR REPLACE only.

create or replace function public.admin_upsert_product_landing_page(
  p_landing_id uuid,
  p_product_id uuid,
  p_title text,
  p_slug text,
  p_campaign_code text,
  p_is_primary boolean,
  p_is_active boolean,
  p_sort_order integer
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_landing_id uuid;
  v_existing record;
  v_title text;
  v_slug text;
  v_campaign_code text;
  v_is_primary boolean;
  v_is_active boolean;
  v_sort_order integer;
begin
  perform public.assert_admin();

  if not exists (
    select 1
    from public.products
    where id = p_product_id
  ) then
    raise exception 'product_not_found' using errcode = 'P0002';
  end if;

  v_title := btrim(p_title);
  if char_length(v_title) < 1 then
    raise exception 'landing_title_required' using errcode = '22023';
  end if;

  v_slug := lower(btrim(p_slug));
  if
    v_slug = ''
    or v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    or char_length(v_slug) > 80
  then
    raise exception 'invalid_landing_slug' using errcode = '22023';
  end if;

  v_campaign_code := nullif(lower(btrim(coalesce(p_campaign_code, ''))), '');
  if
    v_campaign_code is not null
    and (
      v_campaign_code !~ '^[a-z0-9][a-z0-9_-]*$'
      or char_length(v_campaign_code) > 64
    )
  then
    raise exception 'invalid_landing_campaign_code' using errcode = '22023';
  end if;

  v_is_primary := coalesce(p_is_primary, false);
  v_is_active := coalesce(p_is_active, true);
  v_sort_order := coalesce(p_sort_order, 0);

  if v_sort_order < 0 then
    raise exception 'invalid_landing_sort_order' using errcode = '22023';
  end if;

  if v_is_primary and not v_is_active then
    raise exception 'primary_landing_must_be_active' using errcode = '22023';
  end if;

  if p_landing_id is not null then
    select *
    into v_existing
    from public.product_landing_pages
    where id = p_landing_id;

    if not found then
      raise exception 'landing_page_not_found' using errcode = 'P0002';
    end if;

    if v_existing.product_id <> p_product_id then
      raise exception 'landing_product_transfer_not_allowed' using errcode = '22023';
    end if;
  end if;

  if v_is_primary then
    update public.product_landing_pages
    set
      is_primary = false,
      updated_at = now()
    where product_id = p_product_id
      and is_primary = true
      and (p_landing_id is null or id <> p_landing_id);
  end if;

  if p_landing_id is null then
    insert into public.product_landing_pages (
      product_id,
      title,
      slug,
      campaign_code,
      is_primary,
      is_active,
      sort_order
    )
    values (
      p_product_id,
      v_title,
      v_slug,
      v_campaign_code,
      v_is_primary,
      v_is_active,
      v_sort_order
    )
    returning id into v_landing_id;
  else
    update public.product_landing_pages
    set
      title = v_title,
      slug = v_slug,
      campaign_code = v_campaign_code,
      is_primary = v_is_primary,
      is_active = v_is_active,
      sort_order = v_sort_order,
      updated_at = now()
    where id = p_landing_id
    returning id into v_landing_id;
  end if;

  return v_landing_id;
exception
  when unique_violation then
    raise exception 'landing_slug_taken' using errcode = '22023';
end;
$$;

create or replace function public.admin_delete_product_landing_page(
  p_landing_id uuid
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform public.assert_admin();

  delete from public.product_landing_pages
  where id = p_landing_id;

  if not found then
    raise exception 'landing_page_not_found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.admin_upsert_product_landing_page(
  uuid, uuid, text, text, text, boolean, boolean, integer
) from public;
revoke all on function public.admin_delete_product_landing_page(uuid) from public;

grant execute on function public.admin_upsert_product_landing_page(
  uuid, uuid, text, text, text, boolean, boolean, integer
) to authenticated;
grant execute on function public.admin_delete_product_landing_page(uuid) to authenticated;
