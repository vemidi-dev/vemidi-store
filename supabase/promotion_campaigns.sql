-- Groups existing product promotion rows into manageable campaigns.
-- Existing storefront and checkout price resolution remain unchanged.

create table if not exists public.promotion_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  discount_percentage numeric(5, 2) not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint promotion_campaigns_name_check check (char_length(btrim(name)) >= 1),
  constraint promotion_campaigns_discount_check check (
    discount_percentage > 0 and discount_percentage <= 100
  ),
  constraint promotion_campaigns_period_check check (ends_at > starts_at)
);

alter table public.product_promotions
  add column if not exists campaign_id uuid
  references public.promotion_campaigns (id) on delete cascade;

create index if not exists product_promotions_campaign_idx
  on public.product_promotions (campaign_id);

alter table public.promotion_campaigns enable row level security;

grant select on public.promotion_campaigns to anon, authenticated;
grant insert, update, delete on public.promotion_campaigns to authenticated;

drop policy if exists "promotion_campaigns_public_read"
  on public.promotion_campaigns;
create policy "promotion_campaigns_public_read"
on public.promotion_campaigns
for select
to anon, authenticated
using (true);

drop policy if exists "promotion_campaigns_admin_write"
  on public.promotion_campaigns;
create policy "promotion_campaigns_admin_write"
on public.promotion_campaigns
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create or replace function public.admin_create_promotion_campaign(
  p_name text,
  p_discount_percentage numeric,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_is_active boolean,
  p_product_ids uuid[]
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_campaign_id uuid;
  v_product_count integer;
begin
  perform public.assert_admin();

  if
    nullif(btrim(p_name), '') is null
    or p_discount_percentage <= 0
    or p_discount_percentage > 100
    or p_ends_at <= p_starts_at
    or coalesce(cardinality(p_product_ids), 0) = 0
  then
    raise exception 'invalid_campaign' using errcode = '22023';
  end if;

  select count(*)
  into v_product_count
  from public.products
  where id = any(p_product_ids);

  if v_product_count <> (
    select count(distinct product_id)
    from unnest(p_product_ids) as selected(product_id)
  ) then
    raise exception 'invalid_campaign_product' using errcode = '22023';
  end if;

  insert into public.promotion_campaigns (
    name,
    discount_percentage,
    starts_at,
    ends_at,
    is_active
  )
  values (
    btrim(p_name),
    p_discount_percentage,
    p_starts_at,
    p_ends_at,
    coalesce(p_is_active, true)
  )
  returning id into v_campaign_id;

  insert into public.product_promotions (
    product_id,
    campaign_id,
    name,
    discount_type,
    discount_value,
    starts_at,
    ends_at,
    is_active
  )
  select
    selected.product_id,
    v_campaign_id,
    btrim(p_name),
    'percentage',
    p_discount_percentage,
    p_starts_at,
    p_ends_at,
    coalesce(p_is_active, true)
  from (
    select distinct product_id
    from unnest(p_product_ids) as products(product_id)
  ) selected;

  return v_campaign_id;
end;
$$;

create or replace function public.admin_set_promotion_campaign_active(
  p_campaign_id uuid,
  p_is_active boolean
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform public.assert_admin();

  update public.promotion_campaigns
  set is_active = p_is_active, updated_at = now()
  where id = p_campaign_id;

  if not found then
    raise exception 'campaign_not_found' using errcode = 'P0002';
  end if;

  update public.product_promotions
  set is_active = p_is_active
  where campaign_id = p_campaign_id;
end;
$$;

revoke all on function public.admin_create_promotion_campaign(
  text, numeric, timestamptz, timestamptz, boolean, uuid[]
) from public;
revoke all on function public.admin_set_promotion_campaign_active(
  uuid, boolean
) from public;

grant execute on function public.admin_create_promotion_campaign(
  text, numeric, timestamptz, timestamptz, boolean, uuid[]
) to authenticated;
grant execute on function public.admin_set_promotion_campaign_active(
  uuid, boolean
) to authenticated;

