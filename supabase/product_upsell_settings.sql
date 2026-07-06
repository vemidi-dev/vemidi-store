-- Product upsell section settings.
-- Safe to re-run. Run manually before deploying app code that saves
-- product-specific upsell section titles from the admin panel.

begin;

create table if not exists public.product_upsell_settings (
  source_product_id uuid primary key
    references public.products (id) on delete cascade,
  section_title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_upsell_settings_source_idx
  on public.product_upsell_settings (source_product_id);

drop trigger if exists product_upsell_settings_set_updated_at
  on public.product_upsell_settings;
create trigger product_upsell_settings_set_updated_at
before update on public.product_upsell_settings
for each row
execute function public.set_updated_at();

alter table public.product_upsell_settings enable row level security;

grant select on public.product_upsell_settings to anon, authenticated;
grant insert, update, delete on public.product_upsell_settings to authenticated;

drop policy if exists "product_upsell_settings_public_read"
  on public.product_upsell_settings;
create policy "product_upsell_settings_public_read"
on public.product_upsell_settings
for select
to anon, authenticated
using (true);

drop policy if exists "product_upsell_settings_admin_write"
  on public.product_upsell_settings;
create policy "product_upsell_settings_admin_write"
on public.product_upsell_settings
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

commit;
