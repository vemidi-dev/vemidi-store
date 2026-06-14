# Deployment and rollback

## Vercel project

The production project is connected to:

- repository: `vemidi-dev/vemidi-store`;
- production branch: `main`;
- temporary domain: `https://vemidi-store.vercel.app`.

Every push to `main` should create a production deployment automatically. Pull requests and other
branches create preview deployments.

## Environment variables

Configure these in Vercel for **Production and Preview**:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SECRET_KEY
CHECKOUT_RATE_LIMIT_SECRET
NEXT_PUBLIC_SITE_URL
RESEND_API_KEY
ORDER_NOTIFICATION_FROM
ORDER_NOTIFICATION_TO
```

`RESEND_API_KEY` enables transactional emails after checkout. Without it the store still accepts
orders, but no email is sent. Verify the sender domain in Resend before production use.

`ECONT_API_USERNAME` and `ECONT_API_PASSWORD` enable live city/office lookup for Econt checkout.
Use the same API credentials as the campaign landing pages. Without them checkout falls back to
manual delivery fields.

Use `https://vemidi-store.vercel.app` for `NEXT_PUBLIC_SITE_URL` while the store is on the temporary
domain. Change it to `https://vemidi-crafts.com` only when the domain is moved to this project.

`SUPABASE_SECRET_KEY` and `CHECKOUT_RATE_LIMIT_SECRET` must remain sensitive server-only variables.
Do not add a `NEXT_PUBLIC_` prefix. Vercel sensitive variables cannot be exposed to local Development;
keep matching local values only in `.env.local`.

After changing any environment variable, create a new deployment. Existing deployments keep the old
environment snapshot.

## Before pushing

Run:

```text
npm run env:check
npm test
npm run lint
npm run typecheck
npm run supabase:check
npm run build
```

Do not push `.env.local`, secret keys, exported subscriber CSV files, or exported order CSV files.

## Database migrations

Apply new SQL files before deploying code that requires them. Follow `docs/SUPABASE_MIGRATIONS.md`.
For changes that remove public permissions, add the required Vercel server secret and redeploy first
to avoid checkout downtime.

### Migration #34 (`product_slug_and_code.sql`)

Apply this migration before deploying SEO slug / product code application changes:

1. export `products`, `product_images`, and `orders` from Supabase;
2. run the complete `supabase/product_slug_and_code.sql` file in the SQL editor;
3. run `npm run supabase:check` locally and confirm slug/code checks pass;
4. deploy to a Vercel Preview branch;
5. run the production smoke test checklist below on Preview;
6. deploy to Production only after Preview passes;
7. keep the export until the production smoke test is complete.

### Product subcategories (`category_hierarchy.sql`)

Apply this migration before deploying the category hierarchy application changes:

1. export `categories` and `product_categories`;
2. run `supabase/category_hierarchy.sql`;
3. confirm existing categories remain top-level;
4. deploy to Preview;
5. create a test child category and assign a product;
6. verify `/categories`, `/categories/<slug>`, `/shop`, `/sitemap.xml`, and the admin category form;
7. deploy to Production only after the checks pass.

Before a destructive schema change:

1. export the affected tables from Supabase;
2. record which SQL file is being applied;
3. verify the change in the SQL editor;
4. keep the export until the production smoke test is complete.

## Production smoke test

After every production deployment:

1. Open `/`, `/shop`, `/categories`, `/occasions`, `/blog`, and `/events`.
2. Open a product, select its available options, and add it to the cart.
3. Submit one cash-on-delivery test order with recognizable test contact details.
4. Confirm the redirect to `/thank-you`.
5. Open `/admin` and verify the order source, item details, total, and status.
6. Change the test order status and confirm the filtered view is preserved.
7. Open the Blog, Events, Wishes, and Subscriptions tabs.
8. Verify that order and subscriber CSV exports require an administrator session.
9. Remove or clearly mark the test order in Supabase after verification.

## Rollback

For an application regression:

1. Open the Vercel project and select **Deployments**.
2. Open the last known good deployment.
3. Use **Instant Rollback** or promote that deployment to Production.
4. Verify the main routes and admin login.

For a database regression, rolling back Vercel is not enough. Restore the affected table from the
pre-migration export or apply a reviewed corrective SQL migration. Never use destructive reset
commands against the shared Supabase project because it also contains landing-page orders.

## Moving to the main domain

When the store is ready for `vemidi-crafts.com`:

1. attach the domain to the store Vercel project;
2. update `NEXT_PUBLIC_SITE_URL`;
3. update Supabase Authentication Site URL and exact Redirect URLs;
4. redeploy;
5. verify password recovery, sitemap, canonical URLs, checkout, and the Purchase event;
6. keep the previous deployment available until the full smoke test passes.
