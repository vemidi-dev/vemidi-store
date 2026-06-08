-- Restore public storefront read privileges and RLS policies.
-- Both table grants and SELECT policies are required when RLS is enabled.

grant select on public.products to anon, authenticated;
grant select on public.categories to anon, authenticated;
grant select on public.product_categories to anon, authenticated;
grant select on public.color_groups to anon, authenticated;
grant select on public.color_options to anon, authenticated;
grant select on public.product_color_fields to anon, authenticated;
grant select on public.product_color_field_options to anon, authenticated;

drop policy if exists "products_read_public" on public.products;
create policy "products_read_public"
on public.products
for select
to anon, authenticated
using (true);

drop policy if exists "categories_read_public" on public.categories;
create policy "categories_read_public"
on public.categories
for select
to anon, authenticated
using (true);

drop policy if exists "product_categories_read_public" on public.product_categories;
create policy "product_categories_read_public"
on public.product_categories
for select
to anon, authenticated
using (true);

drop policy if exists "color_groups_read_public" on public.color_groups;
create policy "color_groups_read_public"
on public.color_groups
for select
to anon, authenticated
using (true);

drop policy if exists "color_options_read_public" on public.color_options;
create policy "color_options_read_public"
on public.color_options
for select
to anon, authenticated
using (true);

drop policy if exists "product_color_fields_read_public" on public.product_color_fields;
create policy "product_color_fields_read_public"
on public.product_color_fields
for select
to anon, authenticated
using (true);

drop policy if exists "product_color_field_options_read_public"
on public.product_color_field_options;
create policy "product_color_field_options_read_public"
on public.product_color_field_options
for select
to anon, authenticated
using (true);
