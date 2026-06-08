# Unified admin setup

The store is the central admin application. It uses Supabase Auth and `public.admin_users` for:

- products and categories;
- orders created by the butterfly landing page;
- password recovery.

The landing page can continue creating orders with its server-side service role key. Its old admin
panel should remain available until the new orders section has been verified in production.

## 1. Database access

Run `supabase/admin_orders_access.sql` in the shared Supabase project's SQL Editor.

The script keeps `orders` private and allows only users listed in `public.admin_users` to:

- read orders;
- update the `status` column.

Run `supabase/store_checkout_orders.sql` to enable checkout submissions from the store. It exposes
only the dedicated order function to visitors; direct anonymous inserts and reads of `orders` remain
blocked.

## 2. Supabase Auth URLs

In Supabase, open **Authentication > URL Configuration**.

Set:

- **Site URL** to the production origin of the store, for example `https://store.example.com`;
- **Redirect URLs** to:
  - `https://store.example.com/auth/confirm`;
  - `https://store.example.com/auth/confirm?next=/admin/update-password`;
  - `http://localhost:3000/**` for local development.

Use exact production URLs instead of broad wildcards.

## 3. Store environment

In the store's Vercel project, set:

```text
NEXT_PUBLIC_SITE_URL=https://store.example.com
```

Keep the existing `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## 4. Verification

1. Open `/admin/login` in the store.
2. Use **Забравена парола** instead of sending a reset from the Supabase dashboard.
3. Confirm that the email returns to `/admin/update-password` in the store.
4. Open **Поръчки** and change the status of one existing order.
5. Confirm the same status is visible in Supabase.
6. Add a store product to the cart and submit a cash-on-delivery order.
7. Confirm that the new order and all its item details appear in the store admin panel.

Only after these checks should the landing page's old `/admin` route be redirected or removed.
