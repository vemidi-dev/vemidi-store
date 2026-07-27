-- Product page CTA ("Виж готов вариант") and personalization accordion defaults.
-- Run manually in Supabase. Safe to re-run.

begin;

alter table public.products
  add column if not exists show_ready_product_cta boolean not null default false,
  add column if not exists ready_product_cta_label text,
  add column if not exists ready_product_cta_product_id uuid references public.products (id) on delete set null,
  add column if not exists personalization_open_by_default boolean;

comment on column public.products.show_ready_product_cta is
  'When true, storefront may show the ready-product CTA on the product page.';
comment on column public.products.ready_product_cta_label is
  'Optional CTA label. Defaults to "Вижте готов вариант".';
comment on column public.products.ready_product_cta_product_id is
  'Optional target product for the ready-product CTA. Falls back to first related product when enabled.';
comment on column public.products.personalization_open_by_default is
  'Overrides whether the personalization accordion starts open. Null keeps layout-based defaults.';

commit;
