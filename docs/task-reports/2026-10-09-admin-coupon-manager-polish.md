# Admin coupon manager polish

Date: 2026-10-09

## Scope

Improve admin management for discount coupons without changing checkout behavior or database schema.

## Changes

- Added a bulk coupon generator in `components/admin/discount-coupon-panel.tsx`.
  - Admin can enter prefix, count, percentage, optional expiry, and active state.
  - Codes are generated as checkout-safe uppercase alphanumeric strings.
  - Maximum batch size is 100 codes.
- Added `createDiscountCouponBatch` in `app/admin/coupon-actions.ts`.
  - Server-side admin auth is reused.
  - Generated codes are checked against existing `discount_coupons.code` values before insert.
  - Duplicate race errors return a Bulgarian admin message.
- Added local coupon list search and status filters.
  - Search covers code, order id/short id, customer name, email, and phone.
  - Status filters: all, ready to use, active, inactive, unused, used, expired.
- Added form field constants for bulk prefix/count in `lib/admin/form-fields.ts`.

## Decisions

- Used coupons remain locked from reactivation in the UI.
- No checkout code, RPC, or Supabase migration was changed.
- Existing single-coupon creation remains available.

## Verification

- `npm run typecheck` — pass.
- `npx tsx --test tests/discount-coupons.test.ts tests/checkout-coupon-preview-ux.test.ts` — 17/17 pass.
- Vercel preview tested by admin user — pass.
- Production promote: `https://vemidi-store-3caduvera-ve-mi-di.vercel.app` — ready.
- Manual alias correction:
  - `https://vemidi-crafts.com` → `dpl_4EnQxwcteTyA8bEJtG3sSJxFNPq5`.
  - `https://www.vemidi-crafts.com` → `dpl_4EnQxwcteTyA8bEJtG3sSJxFNPq5`.
  - `https://vemidi-store.vercel.app` → `dpl_4EnQxwcteTyA8bEJtG3sSJxFNPq5`.
- Production smoke:
  - `https://vemidi-crafts.com/` — 200.
  - `https://www.vemidi-crafts.com/` — 308 to apex.
  - `https://vemidi-crafts.com/admin?tab=promotions` — 307 to admin login.
  - `https://vemidi-crafts.com/` static assets include `dpl=dpl_4EnQxwcteTyA8bEJtG3sSJxFNPq5`.

## Manual QA

1. Open `/admin?tab=promotions`.
2. Create a small coupon batch, for example prefix `TEST`, count `3`, percentage `10`.
3. Confirm new codes appear at the top of the coupon list.
4. Search by prefix and filter by “Готови за ползване”.
5. Deactivate/reactivate one unused code.
6. Confirm checkout still accepts one generated code and marks it used after order completion.
