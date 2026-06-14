# Supabase Migration Order

Apply the SQL files in this order for a new environment:

1. `supabase/products_table.sql`
2. `supabase/add_product_extra_info_fields.sql`
3. `supabase/refactor_multi_categories.sql`
4. `supabase/add_product_color_configuration.sql`
5. `supabase/admin_auth.sql`
6. `supabase/storage_product_images.sql`
7. `supabase/atomic_product_admin_functions.sql`
8. `supabase/admin_orders_access.sql`
9. `supabase/store_checkout_orders.sql`
10. `supabase/category_types.sql`
11. `supabase/blog_and_events.sql`
12. `supabase/subscription_topics.sql`
13. `supabase/subscription_admin_management.sql`
14. `supabase/product_personalization_and_wishes.sql`
15. Re-run `supabase/store_checkout_orders.sql`
16. `supabase/security_hardening_phase1.sql`
17. `supabase/security_hardening_phase2.sql`
18. `supabase/category_home_display.sql`
19. `supabase/product_image_gallery.sql`
20. `supabase/color_palette_management.sql`
21. `supabase/atomic_product_personalization.sql`
22. `supabase/product_wish_assignments.sql`
23. `supabase/product_promotions.sql`
24. `supabase/product_sold_out.sql`
25. `supabase/product_card_badge.sql`
26. `supabase/campaign_order_attribution.sql`
27. `supabase/universal_product_options.sql`
28. `supabase/personalization_field_price_delta.sql`
29. `supabase/duplicate_product.sql`
30. `supabase/product_gallery_import_replace.sql`
31. `supabase/event_gallery_images.sql`
32. `supabase/category_card_description.sql`
33. `supabase/site_content_settings.sql`
34. `supabase/product_slug_and_code.sql`

`supabase/migrate_product_color_rules_to_fields.sql` is needed only when upgrading an installation
that already contains the older `product_color_rules` data. Run it after
`add_product_color_configuration.sql`.

For an existing environment, apply only migrations that have not already been run. The orders
access migration depends on `admin_auth.sql` and the landing page's `public.orders` table.

Run `admin_orders_access.sql` after the landing page has created `public.orders`. It grants
authenticated administrators read access to orders and permission to update only the `status`
column. Anonymous visitors and regular authenticated users remain blocked by RLS.

Run `store_checkout_orders.sql` after the shared `public.orders` table and the product color tables
exist. It adds the `create_store_order` RPC used by the storefront checkout. The function:

- can be executed only with the server-side Supabase service role;
- requires an idempotency key and returns the existing order for repeated requests;
- limits each privacy-safe client fingerprint to 8 checkout attempts per 15 minutes;
- accepts only cash-on-delivery orders;
- reloads product names and prices from `public.products`;
- validates quantities, personalization, and allowed color selections;
- stores each personalization field structurally in the order payload while keeping a readable summary;
- calculates the total in Postgres;
- stores the itemized order in `orders.raw_payload`;
- keeps the existing landing-page order format compatible with the unified admin panel.

Before applying the latest checkout migration to an existing deployment, add
`SUPABASE_SECRET_KEY` to the local and Vercel environments and redeploy the application. A legacy
`SUPABASE_SERVICE_ROLE_KEY` is also supported, but the new `sb_secret_...` key is preferred.
After that, rerun the complete `store_checkout_orders.sql` file. It removes the older anonymous
four-argument function, installs the protected five-argument version, and creates the server-only
checkout rate-limit function. Only an HMAC fingerprint is stored; the visitor's readable IP address
is not written to the database.

Run `blog_and_events.sql` to add public blog posts and events with admin-only create, update, and
delete access. Published rows are readable by visitors; drafts remain visible only to administrators.
Images use the existing `product-images` bucket under separate `blog/` and `events/` folders.
The migration also creates the private newsletter subscriber table and the public subscription RPC.
It is safe to run the complete file again when upgrading an existing Blog/Events installation because
the additional columns and tables use idempotent statements.
The latest version also adds an optional article CTA label and product-category target. Blog entries
can be saved as drafts with incomplete body content; publication still requires an excerpt and full
text.
It also creates private event registrations, atomically reserves available places, and lets
administrators confirm or cancel registrations. Cancelling returns the reserved places. Apply
`store_checkout_orders.sql` first because the public event form reuses its protected rate-limit RPC.

Run `subscription_admin_management.sql` after `blog_and_events.sql` to enable the protected
“Абонаменти” tab in the admin panel. It grants authenticated access at the table level, while RLS
continues to allow reading and editing only for users present in `public.admin_users`. Public visitors
can subscribe only through `subscribe_to_topics` and cannot read the subscriber list.

Run `product_personalization_and_wishes.sql` after categories and products exist. Re-run
`store_checkout_orders.sql` afterwards so checkout validates and stores the latest personalization
field format.

For an existing production deployment, security hardening is intentionally split:

1. run `security_hardening_phase1.sql`;
2. deploy the matching application code and verify blog/event subscription forms;
3. run `security_hardening_phase2.sql`.

Phase 1 creates the server-only subscription RPC, binds admin checks to the current authenticated
user, and restricts uploaded images to PNG/JPEG/WebP files up to 5 MB. Phase 2 removes direct browser
execution of the legacy public subscription RPCs. Do not reverse steps 2 and 3, or the currently
deployed forms may briefly stop accepting subscriptions.

Run `category_types.sql` to separate categories into `product` and `occasion`. Existing rows are
preserved and start as product categories; reclassify occasion rows from the admin panel. This
migration also restores the missing authenticated table privileges while the existing RLS policies
continue to restrict writes to administrators.

Run `category_home_display.sql` after `category_types.sql`. It keeps existing categories visible,
adds a separate home-page position for each category type, and enables the admin controls for
showing, hiding, and reordering home-page categories.

Run `product_image_gallery.sql` after the product and admin migrations. It backfills every existing
`products.image_url` into an ordered gallery and adds admin-only operations for uploading, choosing
the primary image, reordering, and deleting gallery images.

Run `color_palette_management.sql` after the existing color configuration and admin migrations. It
removes the old paper/wood-only restriction and enables reusable palettes such as ribbons, text,
flowers, and future materials.

Run `atomic_product_personalization.sql` after `product_personalization_and_wishes.sql`. It moves
personalization-field management into the product create/edit transaction, so products and their
fields are always saved together.

Run `product_wish_assignments.sql` after `atomic_product_personalization.sql`. It assigns wishes
directly to products, backfills the current occasion-based matches, and adds them to atomic saves.

If storefront tables return `permission denied` or an empty result despite containing rows, run
`supabase/restore_storefront_read_grants.sql`. It restores both PostgreSQL grants and RLS SELECT
policies.

If product RPCs return a write permission error, run
`supabase/restore_admin_product_write_grants.sql`. The grants enable the `SECURITY INVOKER`
functions to write, while the existing RLS policies still restrict those writes to administrators.

## Atomic Product Functions

The application now requires these RPC functions:

- `admin_create_product`
- `admin_update_product`
- `admin_delete_product`

Each function checks `is_admin(auth.uid())`. Product rows, category relations, color fields, and color
options are committed or rolled back together.

Storage objects cannot participate in the Postgres transaction. The application compensates by:

- deleting a newly uploaded image when create/update RPC fails;
- deleting the previous image after a successful replacement;
- deleting the product image after a successful product deletion.

Only URLs from the `product-images` Supabase bucket are eligible for automatic deletion.

Run `product_promotions.sql` after products and admin auth exist. It adds time-bound percentage or
fixed discounts, updates storefront pricing helpers, and extends `create_store_order` to apply active
promotions server-side.

Run `product_sold_out.sql` after `product_promotions.sql`. It adds `products.is_sold_out`, blocks
sold-out products during checkout, and updates the checkout RPC.

Run `product_card_badge.sql` after `product_sold_out.sql`. It adds optional storefront card badges
such as `new` or `bestseller`.

Run `campaign_order_attribution.sql` after `product_card_badge.sql` on deployments that do not yet
have the six-argument `create_store_order` function with campaign attribution.

Run `universal_product_options.sql` after `campaign_order_attribution.sql`. It adds:

- `product_option_groups` and `product_option_values`;
- `upsert_product_option_groups` for atomic admin saves that preserve UUIDs;
- `validate_product_option_selections` for server-side option validation and pricing;
- `admin_create_product_v4` / `admin_update_product_v4`;
- the latest `create_store_order` with universal option snapshots and option delta pricing.

The migration is safe for existing products and orders. Legacy color fields and personalization
fields are not migrated automatically.

Run `personalization_field_price_delta.sql` after `universal_product_options.sql`. It adds an
admin-managed surcharge to each legacy personalization field. A zero value remains free; a positive
value is added server-side only when the customer fills that field.

Run `duplicate_product.sql` after `personalization_field_price_delta.sql`. It adds
`admin_duplicate_product(p_product_id uuid)`, which clones a product's saved configuration with fresh
UUIDs for option groups, values, color fields, and personalization fields. Image files are copied
separately in the application layer to avoid shared storage references.

Run `product_gallery_import_replace.sql` after `duplicate_product.sql`. It adds
`admin_import_product_images` for duplicate gallery copy with preserved order, alt text, and primary
image metadata, plus `admin_replace_product_gallery_image` for safe single-image replacement after a
new optimized file is uploaded in Storage.

To verify the admin gallery RPCs exist without mutating data, run in the Supabase SQL editor:

```sql
select proname
from pg_proc
join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
where pg_namespace.nspname = 'public'
  and proname in (
    'admin_duplicate_product',
    'admin_import_product_images',
    'admin_replace_product_gallery_image'
  )
order by proname;
```

The smoke check script calls each RPC with the service role and expects `admin_required` (no
authenticated admin session) or a not-found error — no rows are created or updated.

Run `event_gallery_images.sql` after blog/events migrations. It stores ordered gallery images for past
workshops, with admin upload/reorder support and public display on the events page.

Run `product_slug_and_code.sql` after `site_content_settings.sql`. The file is wrapped in
`begin;` / `commit;` so a failed step rolls back the whole migration. It adds:

- `products.slug` and `products.product_code` with unique indexes;
- `product_slug_history` with public read RLS for storefront redirects and admin-only insert;
- `product_code_seq` and `next_product_code()` for atomic `VM-000001` style codes;
`next_product_code()` is `SECURITY DEFINER`, calls `assert_admin()` before `nextval()`,
grants `EXECUTE` only to `authenticated`, and keeps the sequence owner-only;
- slug helpers (`slugify_product_name`, `reserve_unique_product_slug`, etc.);
- `admin_create_product_v5` / `admin_update_product_v5` with server-side slug validation;
- `admin_create_product_v4` wrapper that delegates to v5 (for older app builds);
- updated `admin_duplicate_product` with fresh slug and product code;
- updated `create_store_order` snapshots with `productCode` and `productSlug`.

Existing products are backfilled deterministically: codes by `created_at, id`, slugs from transliterated
names with uniqueness suffixes. Re-running the migration does not overwrite existing slug or product_code
values. An empty `products` table is supported: the sequence is initialized with
`setval(seq, 1, false)` so the first new code is `VM-000001`.

Safe apply order for migration #34:

1. export `products`, `product_images`, and `orders` from Supabase;
2. run the complete `supabase/product_slug_and_code.sql` file in the SQL editor;
3. run `npm run supabase:check` locally;
4. deploy to a Vercel Preview and run the smoke test from `docs/DEPLOYMENT.md`;
5. deploy to Production only after Preview passes.

UUID product URLs continue to work via application redirects after deploy.

If product create fails with PostgreSQL error `23502` after migration #34, run
`supabase/product_slug_admin_rpc_hotfix.sql` in the SQL editor. That replaces
`admin_create_product_v5` (SECURITY DEFINER + inline `nextval`) and redefines
`admin_create_product_v4` as a wrapper to v5.

Run `product_inventory_fulfillment.sql` after `product_slug_and_code.sql` (and the hotfix if applied).
Migration #35 adds product fulfillment modes and optional stock tracking:

- `products.fulfillment_type` — `made_to_order` (default), `stocked`, or `unavailable`;
- `products.stock_quantity` — nullable integer, required and `>= 0` only when `fulfillment_type = stocked`;
- CHECK constraints for mode/stock consistency and non-negative quantities;
- backfill of all existing products to `made_to_order` with `stock_quantity = null`;
- `validate_product_fulfillment_fields()` helper;
- `admin_create_product_v6` / `admin_update_product_v6` with server-side fulfillment validation;
- v5 wrappers preserved for backward compatibility;
- updated `admin_duplicate_product` — inherits `fulfillment_type`, resets `stock_quantity` to `0` for `stocked` duplicates (never copies source warehouse qty);
- updated `create_store_order` — aggregates cart demand per product, `FOR UPDATE` row locks, atomic stock decrement for `stocked`, stable `insufficient_stock` / `product_unavailable` errors, order snapshots with `fulfillmentType`, `stockQuantityBefore`, `stockQuantityAfter`.

**Duplicate safe behavior:** cloned product keeps the parent's fulfillment mode; if mode is `stocked`, stock starts at `0` so the admin must set quantity before sales.

**Future work (not in this migration):** release stock when an order is cancelled.

Safe apply order for migration #35:

1. export `products` and `orders` from Supabase;
2. run the complete `supabase/product_inventory_fulfillment.sql` file in the SQL editor;
3. run `npm run supabase:check` locally;
4. deploy to a Vercel Preview and smoke-test checkout for both `made_to_order` and `stocked` products;
5. deploy to Production only after Preview passes.

`is_sold_out` remains supported alongside fulfillment modes until fully replaced in a later phase.

Run `product_inventory_checkout_hardening.sql` after `product_inventory_fulfillment.sql`. Migration #36 hardens `create_store_order`:

- locks every ordered product row with `FOR UPDATE` in stable `product_id` order;
- checks `is_sold_out` before `unavailable` and stock validation;
- returns `product_sold_out` when the manual sold-out flag is set, even if stock is zero;
- keeps aggregated demand, atomic decrement, idempotent retries, and order snapshots from #35.

Safe apply order for migrations #35 and #36:

1. export `products` and `orders` from Supabase;
2. run `supabase/product_inventory_fulfillment.sql` in the SQL editor;
3. run `supabase/product_inventory_checkout_hardening.sql` in the SQL editor;
4. run `npm run supabase:check` locally;
5. configure `SUPABASE_TEST_URL` + `SUPABASE_TEST_SECRET_KEY` on a separate test project, apply the same migrations there, then run `npm run test:integration`;
6. deploy to a Vercel Preview and smoke-test checkout for `made_to_order` and `stocked` products;
7. deploy to Production only after Preview and integration tests pass.

Rollback (app + database):

1. redeploy the previous app build that calls `admin_create_product_v5` / `admin_update_product_v5`;
2. in Supabase SQL editor, redeploy the previous `create_store_order` from `product_slug_and_code.sql` (or the last known-good checkout migration);
3. optional: keep `fulfillment_type` / `stock_quantity` columns in place — they are nullable/default-safe and do not break v5 RPC wrappers;
4. do not drop v5 functions; #35 keeps them as wrappers for rollback.

To verify the new admin RPCs exist without mutating data, run in the Supabase SQL editor:

```sql
select proname
from pg_proc
join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
where pg_namespace.nspname = 'public'
  and proname in (
    'admin_create_product_v6',
    'admin_update_product_v6',
    'validate_product_fulfillment_fields'
  )
order by proname;
```

Migration #34 admin RPC verification (still supported via v5 wrappers):

```sql
select proname
from pg_proc
join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
where pg_namespace.nspname = 'public'
  and proname in (
    'admin_create_product_v5',
    'admin_update_product_v5'
  )
order by proname;
```

## Product category hierarchy

Run `category_hierarchy.sql` before deploying the application changes that add
subcategory management and `/categories/[slug]` pages.

The migration is non-destructive:

- existing categories remain top-level (`parent_id = null`);
- product assignments in `product_categories` are unchanged;
- only product categories may have a parent;
- the hierarchy is limited to two levels;
- deleting a parent with children is blocked;
- moving categories only changes the order among siblings.

Safe apply order:

1. export `categories` and `product_categories` from Supabase;
2. run `supabase/category_hierarchy.sql` in the SQL editor;
3. verify that all existing rows have `parent_id = null`;
4. deploy the application to Vercel Preview;
5. create one test subcategory and assign a test product to it;
6. verify the parent category, subcategory page, shop filter, sitemap, and admin edit form;
7. deploy to Production only after Preview passes.

Verification query:

```sql
select
  child.name as category,
  parent.name as parent_category,
  child.category_type,
  child.home_sort_order
from public.categories child
left join public.categories parent on parent.id = child.parent_id
order by coalesce(parent.name, child.name), child.parent_id nulls first, child.home_sort_order;
```
