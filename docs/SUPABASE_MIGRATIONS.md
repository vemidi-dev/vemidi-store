# Supabase Migration Order

Apply the SQL files in this order for a new environment:

1. `supabase/products_table.sql`
2. `supabase/add_product_extra_info_fields.sql`
3. `supabase/add_product_color_configuration.sql`
4. `supabase/admin_auth.sql`
5. `supabase/storage_product_images.sql`
6. `supabase/atomic_product_admin_functions.sql`
7. `supabase/admin_orders_access.sql`
8. `supabase/store_checkout_orders.sql`
9. `supabase/blog_and_events.sql`

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
