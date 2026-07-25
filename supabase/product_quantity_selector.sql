-- Manual migration: product-level control for quantity selector visibility.
-- Run in Supabase SQL Editor before deploying app code that reads this column.

alter table public.products
  add column if not exists show_quantity_selector boolean not null default false;

comment on column public.products.show_quantity_selector is
  'When true, the storefront product page shows the quantity selector. Hidden products still add one item by default.';
