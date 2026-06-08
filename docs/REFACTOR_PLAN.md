# Store Refactor Plan

## Goals

- Preserve the current storefront redesign and all existing local changes.
- Reduce duplicated catalog, Supabase, and form-handling logic.
- Make checkout and cart data trustworthy before adding payment or order persistence.
- Split oversized admin modules into smaller, testable units.
- Establish repeatable type-check, lint, build, and regression checks.

## Current Baseline

- Next.js 15 App Router, React 19, TypeScript in strict mode, Tailwind CSS 4.
- Supabase provides authentication, products, categories, product-color rules, and image storage.
- The cart is client-side and persisted in `localStorage`.
- Checkout is currently a placeholder and does not create an order.
- The repository has active, uncommitted layout and home-page redesign work. Refactors must not revert or overwrite it.

## Audit Findings

### P0: Correctness and release safety

- The `lint` script uses `next lint`, which is no longer the supported lint entry point for this Next.js version. Replace it with a direct ESLint command.
- There is no test script or automated regression suite.
- Cart rows loaded from `localStorage` accept arbitrary finite-looking data too loosely: negative quantities, non-finite prices, and stale client-side prices can reach totals.
- Checkout has no server-side product/price validation and must not be treated as order-ready.
- Multi-table admin writes are implemented as sequential operations with partial manual rollback. Product, category, and color-field state can become inconsistent when a later operation fails.
- Uploaded replacement images and images for failed product creation are not cleaned up from storage.

### P1: Architecture and maintainability

- `/shop` and `/products` implement overlapping catalog experiences with separate queries, filters, and product mapping.
- Product database row types and mapping logic are repeated across storefront pages.
- `app/admin/page.tsx` is a very large page containing data loading, mapping, tab navigation, forms, and list rendering.
- `app/admin/actions.ts` combines authorization, parsing, validation, storage, and persistence.
- Product color updates use delete-then-insert behavior without a database transaction.
- Static fallback catalog/category data and database-backed catalog data use related but separate models.
- User-facing copy and navigation labels mix Bulgarian and English.

### P2: UX, accessibility, and operations

- The new top bar contains placeholder contact details and generic social links that should not ship unchanged.
- External social links are rendered through `next/link`; plain anchors are clearer for non-application URLs.
- Storefront loading, empty, and database-error states are inconsistent.
- No documented environment setup, migration order, deployment checklist, or rollback procedure exists.
- Remote image hosts are tightly configured but image ownership and cleanup rules are not documented.

## Refactor Phases

### Phase 1: Stabilize the baseline

- [x] Replace the obsolete lint script and make `typecheck`, `lint`, and `build` reliable.
- [x] Fix all current lint and TypeScript failures without changing intended UI behavior.
- [x] Harden cart deserialization and quantity handling.
- [ ] Add focused unit tests for cart line IDs, stored-cart parsing, and money totals.
- [x] Record the production-build baseline for home, catalog, product, cart, login, and admin routes.

### Phase 2: Consolidate the storefront data layer

- [x] Define shared database row types and domain mappers under `lib/storefront`.
- [x] Add repository functions for listing products, category relations, categories, and product details.
- [ ] Choose one canonical catalog route; redirect or intentionally differentiate the other route.
- [x] Move fallback product/category image behavior behind the storefront boundary.
- [ ] Standardize loading, empty, and error states.

### Phase 3: Split the admin surface

- [x] Extract admin query/loading functions from `app/admin/page.tsx`.
- [x] Split category forms, product forms, product lists, navigation, and notices into focused components.
- [x] Move shared admin parameter, draft, and `FormData` parsing into pure modules.
- [x] Separate product image upload operations from product persistence.
- [ ] Replace repeated stringly typed field names with shared constants or schemas.

### Phase 4: Make writes atomic

- [x] Add Supabase/Postgres functions for atomic product create/update/delete operations.
- [x] Enforce and use existing cascading foreign keys for product relations.
- [x] Add storage cleanup for failed uploads, replaced images, and deleted products.
- [x] Map stable database error codes to user-facing action messages.
- [x] Revalidate all affected storefront paths after admin mutations.

### Phase 5: Build a real checkout

- [ ] Define order, order-line, address, fulfillment, and payment-status tables.
- [ ] Re-read products and prices on the server before creating an order.
- [ ] Store prices as integer minor units or an explicitly constrained decimal representation.
- [ ] Add inventory/availability rules if products become stock-limited.
- [ ] Add idempotency and payment-provider integration.
- [ ] Clear the cart only after confirmed order creation.

### Phase 6: UX and production readiness

- [ ] Replace placeholder contact and social configuration.
- [ ] Normalize storefront language and terminology.
- [ ] Audit keyboard navigation, focus states, labels, contrast, and reduced-motion behavior.
- [ ] Add metadata, Open Graph images, structured product data, sitemap, and robots configuration.
- [ ] Add error monitoring, privacy-safe analytics, and operational logging.
- [ ] Document environment variables, migration order, release checks, and rollback steps.

## Immediate Refactor Scope

The first implementation pass should remain low-risk and avoid the files currently being redesigned where possible:

1. Repair project verification scripts.
2. Extract stored-cart parsing and total calculations into pure utilities.
3. Validate persisted cart values and clamp user-entered quantities.
4. Add tests if the existing dependency policy permits a small test runner; otherwise add tests in the next dependency change.
5. Run lint, type-check, and production build.

## Definition of Done

- `npm run typecheck`, `npm run lint`, and `npm run build` pass.
- Storefront and admin routes preserve their intended behavior.
- Cart data cannot produce negative, infinite, or `NaN` totals.
- Shared catalog queries and mappings have one source of truth.
- Product mutations are atomic at the database boundary.
- Checkout validates all purchasable data on the server.
- The repository contains setup, migration, deployment, and rollback documentation.
