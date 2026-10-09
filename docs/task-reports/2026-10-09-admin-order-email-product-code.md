# Admin order email product code

Date: 2026-10-09

## Scope

Add product code visibility to the new-order email sent to the store owner/admin only.

## Changes

- Updated `lib/orders/order-email.ts`.
  - `StoreOrderEmailItem` now carries `productCode` from `raw_payload.order.items`.
  - Admin email item cards render `Код: VM-...` when a product code is available.
  - Customer email keeps the existing item layout and does not show product codes.
- Updated `tests/order-email.test.ts`.
  - Added regression coverage that admin email includes the product code.
  - Added assertion that customer email does not include the product code.

## Verification

- `npx tsx --test tests/order-email.test.ts tests/send-order-notifications.test.ts` — 11/11 pass.
- `npm run typecheck` — pass.

## Notes

- No database change is needed. Current store order payloads already include `productCode` for order items.
- Older orders without `productCode` will simply omit the admin-only code line.
