# Product promo code eligibility — implementation report

Дата: 2026-08-29  
Проект: `D:\Cursor\src` (vemidi-store)  
Статус: **implementation done** (local)  
Template: **не е пипан**  
Production deploy: **не е правен**

## Резюме

Добавено е поле `products.promo_code_eligible` (default `true`). Процентни discount coupons се прилагат само върху eligible line totals. Смесена количка → отстъпка само върху допустимите продукти; само non-eligible → discount `0` + ясно съобщение. Product promotions остават отделна система.

## Променени файлове

### SQL
- `supabase/product_promo_code_eligible.sql` — **нова миграция** (колона + `create_store_order`)
- `supabase/discount_coupons.sql` — колона + eligible subtotal логика (за бъдещ setup)

### Domain / checkout
- `lib/checkout/coupon.ts` — `getCartCouponSubtotals`, `computeCouponOrderTotals`, eligibility messages
- `lib/checkout/errors.ts` — `coupon_not_applicable`
- `app/checkout/coupon-actions.ts` — preview с `eligibleSubtotal`
- `components/checkout/checkout-panel.tsx` — UX съобщения за mixed / none

### Product / cart / admin
- `lib/catalog.ts`, `lib/cart-types.ts`, `lib/cart-storage.ts`, `lib/cart/prepare-cart-line.ts`
- `lib/storefront/mappers.ts`, `lib/storefront/repository.ts`, `lib/storefront/product-upsells.ts`, `lib/product-route.ts`
- `lib/admin/types.ts`, `lib/admin/form-fields.ts`, `lib/admin/form-data.ts`, `lib/admin/params.ts`
- `app/admin/actions.ts`
- `components/admin/product-create-panel.tsx`, `components/admin/product-list-panel.tsx`

### Content
- `lib/content/site-content.ts` — `terms.pricing_text` (правила за промо кодове)

### Tests
- `tests/discount-coupons.test.ts`
- `tests/admin-form-data.test.ts`

## SQL migration

Файл: `supabase/product_promo_code_eligible.sql`

Какво прави:
1. `alter table public.products add column if not exists promo_code_eligible boolean not null default true`
2. Презаписва `create_store_order` така че:
   - трупа `v_eligible_subtotal` само за `coalesce(promo_code_eligible, true)`
   - `v_discount_amount = round(v_eligible_subtotal * percentage / 100, 2)`
   - маркира one-time coupon като used **само ако** `v_discount_amount > 0`
   - записва `eligibleSubtotalPrice` в `raw_payload.order`

## Ръчни стъпки в Supabase

1. Отвори Supabase SQL Editor за production (и staging, ако има).
2. Изпълни съдържанието на `supabase/product_promo_code_eligible.sql`.
3. Провери:
   - колоната съществува: `\d products` / Table Editor → `promo_code_eligible`
   - съществуващите продукти са `true` по default
4. В admin: за заготовки/материали махни отметката „Промо кодовете важат за този продукт“.
5. Ако `terms.pricing_text` е презаписан в admin Site content (таблица `site_content`), добави ръчно новия абзац и там — иначе важи default от `lib/content/site-content.ts`.
6. Smoke checkout:
   - само eligible продукт + код → отстъпка както досега
   - смесена количка → отстъпка само върху eligible
   - само excluded → съобщение без отстъпка; кодът **не** се маркира като използван

> Забележка: докато миграцията не е пусната, storefront `.select(...promo_code_eligible...)` може да хвърли грешка при липсваща колона. Deploy на app кода трябва да е **след** SQL, или колоната да е добавена предварително.

## Поведение (кратко)

| Количка | Preview | Order RPC |
|---------|---------|-----------|
| Всички eligible | `%` от пълен subtotal | същото |
| Смесена | `%` от eligible; total = full − discount; partial message | същото; `eligibleSubtotalPrice` в payload |
| Само non-eligible | `coupon_not_applicable` + none message; без applied code | discount `0`; coupon **не** се маркира used |
| Legacy line без flag | третира се като eligible | `coalesce(..., true)` |

Admin checkbox (default checked): `Промо кодовете важат за този продукт`. Няма hardcode на категории.

## Тестове и резултати

```text
npx tsc --noEmit                          → pass
npx tsx --test tests/discount-coupons.test.ts → 14/14 pass
npx tsx --test tests/admin-form-data.test.ts  → (updated for promo_code_eligible)
```

Покрити сценарии в `discount-coupons.test.ts`:
1. Всички eligible → както досега  
2. Смесена → discount само върху eligible subtotal  
3. Само non-eligible → discount 0 + ясно съобщение  
4. Legacy без flag → eligible  
5. Preview и order math helpers дават еднакъв резултат  

## Production deploy

**Не е правен** в тази стъпка. След ръчно SQL + review → deploy по обичайния процес.

## Rebase / port към актуален main — 2026-08-31

WIP-ът е пренесен в отделен чист worktree върху `origin/main`:

- Worktree: `D:\Cursor\src\.worktrees\product-promo-code-eligibility`
- Branch: `codex/product-promo-code-eligibility`
- Base: `origin/main` @ `0111c5c`
- Старият локален WIP в `D:\Cursor\src` не е променян.

### Решени конфликти

- `app/admin/actions.ts` — запазен е новият shared `createProductDraftWithGallery()` pipeline; `promoCodeEligible` се подава през `postCreate`.
- `lib/storefront/repository.ts` — storefront select-ите запазват новото `dimensions_materials` поле и добавят `promo_code_eligible`.
- `lib/admin/params.ts` — draft recovery третира липсващ `promo_code_eligible` като `true`.

### Проверки

```text
npm run typecheck → pass
npx tsx --test tests/discount-coupons.test.ts tests/admin-form-data.test.ts tests/product-json-import-v2-map.test.ts tests/product-create-pipeline.test.ts → 30/30 pass
```

### Остава преди production

1. Review на diff-а върху актуален `main`.
2. PR + preview deploy.
3. Ръчно изпълнение на `supabase/product_promo_code_eligible.sql` в production Supabase **преди** production deploy на app кода.
4. Admin smoke: за заготовки/материали отметката `Промо кодовете важат за този продукт` трябва да се махне.
5. Checkout smoke с eligible, mixed и само non-eligible количка.
