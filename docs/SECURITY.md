# Security notes

## Supabase access model

- Public catalog tables allow read-only access.
- Product, category, blog, event, wish, order, and subscriber management requires an authenticated
  user present in `public.admin_users`.
- Checkout and event registration use server-only Supabase credentials and rate-limited RPCs.
- Newsletter subscription uses a separate server-only RPC after the two-phase hardening migration.
- Order and subscriber CSV exports require an administrator session and disable caching.

`public.is_admin(uuid)` verifies that the requested UUID is the current authenticated user's UUID.
This prevents callers from using the helper to probe whether unrelated user IDs are administrators.

## Image uploads

Admin uploads accept only PNG, JPEG, and WebP files up to 5 MB. Validation happens in three places:

1. browser file input;
2. server-side MIME, size, and file-signature checks;
3. Supabase Storage bucket MIME and size restrictions.

SVG is intentionally excluded because uploaded active vector content is unnecessary for product,
blog, and event photography.

## Secrets

`SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `CHECKOUT_RATE_LIMIT_SECRET` are server-only.
Never expose them through a `NEXT_PUBLIC_` variable, screenshots, CSV exports, client code, or Git.

## Operational review

Before every production release:

- run tests, lint, type checking, and production build;
- review new SQL grants and RLS policies;
- verify that new `security definer` functions use a fixed search path;
- verify anonymous users cannot read orders, registrations, subscribers, or admin records;
- test checkout, event registration, and subscriptions without using real customer data.
