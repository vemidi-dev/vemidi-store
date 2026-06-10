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
