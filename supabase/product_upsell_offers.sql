-- Product upsell offers and storefront-only visibility.
-- Safe to re-run. Run manually before deploying app code that reads products.visibility
-- or product_upsell_offers.

begin;

alter table public.products
  add column if not exists visibility text;

update public.products
set visibility = 'public'
where visibility is null;

alter table public.products
  alter column visibility set default 'public',
  alter column visibility set not null;

alter table public.products
  drop constraint if exists products_visibility_check;

alter table public.products
  add constraint products_visibility_check
  check (visibility in ('public', 'upsell_only'));

create index if not exists products_status_visibility_created_at_idx
  on public.products (status, visibility, created_at desc);

comment on column public.products.visibility is
  'Storefront visibility: public products appear in catalog; upsell_only products are only available through configured upsell offers.';

create table if not exists public.product_upsell_offers (
  id uuid primary key default gen_random_uuid(),
  source_product_id uuid not null
    references public.products (id) on delete cascade,
  upsell_product_id uuid not null
    references public.products (id) on delete restrict,
  offer_title text,
  offer_description text,
  special_price numeric(10,2) not null,
  suggested_quantity integer not null default 1,
  max_quantity integer not null default 1,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_upsell_not_self
    check (source_product_id <> upsell_product_id),
  constraint product_upsell_special_price_nonnegative
    check (special_price >= 0),
  constraint product_upsell_suggested_quantity_positive
    check (suggested_quantity >= 1),
  constraint product_upsell_max_quantity_positive
    check (max_quantity >= 1),
  constraint product_upsell_suggested_within_max
    check (suggested_quantity <= max_quantity),
  constraint product_upsell_unique_pair
    unique (source_product_id, upsell_product_id)
);

create index if not exists product_upsell_offers_source_sort_idx
  on public.product_upsell_offers (source_product_id, is_active, sort_order, created_at);

create index if not exists product_upsell_offers_target_idx
  on public.product_upsell_offers (upsell_product_id);

drop trigger if exists product_upsell_offers_set_updated_at
  on public.product_upsell_offers;
create trigger product_upsell_offers_set_updated_at
before update on public.product_upsell_offers
for each row
execute function public.set_updated_at();

alter table public.product_upsell_offers enable row level security;

grant select on public.product_upsell_offers to anon, authenticated;
grant insert, update, delete on public.product_upsell_offers to authenticated;

drop policy if exists "product_upsell_offers_public_read"
  on public.product_upsell_offers;
create policy "product_upsell_offers_public_read"
on public.product_upsell_offers
for select
to anon, authenticated
using (true);

drop policy if exists "product_upsell_offers_admin_write"
  on public.product_upsell_offers;
create policy "product_upsell_offers_admin_write"
on public.product_upsell_offers
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

commit;
