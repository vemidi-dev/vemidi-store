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

## Checkout coupon preview UX fix — 2026-09-08

При ръчен preview тест беше установено, че натискане на `Приложи` за купон може да изчисти вече въведените данни за доставка. Причината е, че `CheckoutPanel` извикваше `previewDiscountCoupon()` директно като server action от client component; това може да предизвика RSC refresh/remount на checkout формата, а `CheckoutDeliveryFields` държи delivery state локално.

### Fix

- Добавен shared server helper: `lib/checkout/coupon-preview.ts`.
- `app/checkout/coupon-actions.ts` остава wrapper за съвместимост.
- Добавен JSON endpoint: `POST /checkout/coupon-preview`.
- `components/checkout/checkout-panel.tsx` вече използва `fetch("/checkout/coupon-preview")`, което проверява купона без refresh на страницата.
- Добавен regression test: `tests/checkout-coupon-preview-ux.test.ts`.

### Очакван UX след fix-а

- Клиентът попълва име/телефон/имейл/доставка.
- Въвежда купон.
- Ако купонът е невалиден или не важи за текущите продукти, се показва съобщение, но вече попълнените checkout данни остават на екрана.
- Ако купонът е валиден, summary-то се обновява без загуба на delivery state.

## Coupon preview invalid-state polish — 2026-09-08

При ръчен mixed-cart тест беше видяно съобщение `Кодът е невалиден и няма да бъде приложен.` вместо expected partial message. Този текст може да идва от две различни причини: реално липсващ/невалиден код или технически проблем при проверката на купона.

### Fix

- Добавен отделен failure code `coupon_unavailable`.
- Preview route/helper вече връщат `coupon_unavailable`, когато service client липсва или Supabase query върне грешка.
- Истински липсващ код остава `coupon_invalid`.
- Lookup-ът на купони вече е case-insensitive:
  - checkout preview използва `.ilike("code", code)`;
  - SQL `create_store_order` използва `where upper(code) = v_coupon_code`.

### Проверки

```text
npx tsx --test tests/discount-coupons.test.ts tests/checkout-coupon-preview-ux.test.ts tests/admin-form-data.test.ts → 24/24 pass
npm run typecheck → pass
```

### Следващ ръчен smoke

1. Пробвай същия купон отново със смесена количка.
2. Ако вече показва partial message, проблемът е бил lookup/preview.
3. Ако пак пише `Кодът е невалиден...`, конкретният код не се намира в `discount_coupons` или не минава формата `A-Z/0-9`, 4–32 символа.
4. Ако пише `Купонът временно не може да бъде проверен...`, има проблем с Preview env/Supabase достъпа, не с логиката на eligible продуктите.

## Pre-production refresh — 2026-10-08

Branch-ът `codex/product-promo-code-eligibility` беше обновен върху актуален `origin/main` след последния Meta Pixel catalog id fix.

### Проверки

```text
git rebase origin/main → pass, без конфликти
npx tsx --test tests/discount-coupons.test.ts tests/checkout-coupon-preview-ux.test.ts tests/admin-form-data.test.ts → 24/24 pass
npm run typecheck → pass
GitHub release-tests → pass
Vercel preview → pass
Preview home HEAD smoke → 200
POST /checkout/coupon-preview със safe dummy code → 200 + coupon_invalid JSON
```

### Preview за ръчен smoke

`https://vemidi-store-git-codex-product-promo-code-eligibility-ve-mi-di.vercel.app`

### Production blocker

Преди production deploy трябва да е изпълнен `supabase/product_promo_code_eligible.sql` в production Supabase. App кодът чете `products.promo_code_eligible`; ако колоната липсва, storefront/admin заявки могат да паднат.

## Production deployment — 2026-10-08

Production Supabase SQL беше потвърдено изпълнен преди merge/deploy.

### Merge / deploy

```text
PR #49 → merged
Merge commit → 9b97b1b0da51d5e840cca3a49ed1140283f9f154
Production deployment → https://vemidi-store-9szspnl82-ve-mi-di.vercel.app
Deployment id → dpl_8j8fadRuwfcWdpm8njAAY2gJxrAX
```

### Production checks

```text
GitHub Release Tests on main → pass
Vercel production deployment → Ready
https://vemidi-crafts.com/ HEAD → 200
POST https://vemidi-crafts.com/checkout/coupon-preview with dummy code → 200 + coupon_invalid JSON
```

### Alias fix

След production build custom domain-ът първоначално още сочеше стар build и `/checkout/coupon-preview` връщаше 404 HTML. Alias-ите бяха ръчно пренасочени към новия production deployment:

```text
vemidi-crafts.com
www.vemidi-crafts.com
vemidi-store.vercel.app
```

След alias update endpoint-ът на custom domain-а върна правилен JSON отговор.

### Remaining manual smoke

Authenticated checkout smoke с реален активен купон остава за ръчна проверка:

1. eligible продукт + купон → нормална отстъпка;
2. само non-eligible заготовки/материали → ясно съобщение без отстъпка;
3. смесена количка → отстъпка само върху eligible subtotal;
4. въведените delivery данни остават при `Приложи купон`.
