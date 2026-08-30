# Admin Product Duplicate Fix

Дата: 2026-08-30  
Repo: `vemidi-dev/vemidi-store`  
Branch: `codex/fix-admin-product-duplicate`

## Проблем

В production админ панела дублирането на продукт не работи нито със снимки, нито без снимки.

Най-вероятната причина е stale Supabase RPC `admin_duplicate_product` спрямо текущата product schema. Когато основният RPC падне, image copy настройката няма значение, защото новият продукт изобщо не се създава.

## Fix

Добавен е fallback path в `duplicateProduct`:

1. Първо се опитва съществуващият RPC `admin_duplicate_product`.
2. Ако RPC върне грешка или липсва нов product id, action-ът логва RPC грешката.
3. След това се прави fallback през актуалния `admin_create_product_v11` pipeline:
   - копира име като `Копие на ...`;
   - генерира уникален `-copy` slug;
   - копира кратко резюме, H2 подзаглавие, описание, допълнителни продуктови секции, цена, fulfillment, категории, основна категория;
   - копира color fields, personalization fields, wish templates и universal option groups;
   - не копира SEO/OG overrides;
   - създава копието като draft;
   - запазва visibility, quantity selector, quantity tiers и personalization open state.
4. Съществуващият image copy flow остава след създаването на новия продукт:
   - без отметка: копието е без снимки;
   - с отметка: снимките се копират в отделни Storage файлове.

## Файлове

| Path | Роля |
|------|------|
| `app/admin/actions.ts` | duplicate action fallback + RPC error logging |
| `lib/admin/duplicate-product-fallback.ts` | fallback builder през `admin_create_product_v11` |

## Проверки

```
npm run typecheck
npx tsx --test tests/duplicate-product.test.ts tests/product-gallery-duplicate.test.ts tests/product-page-content-migration.test.ts tests/product-code.test.ts
```

Резултат:

- `typecheck` — pass
- duplicate/gallery/product-code migration tests — 34/34 pass

## QA след preview/deploy

В админ панела:

1. Дублирай продукт без отметка за снимки.
2. Очакване: създава се draft copy, отваря се редакция на новия продукт, има съобщение за добавяне на снимки.
3. Дублирай продукт с отметка за снимки.
4. Очакване: създава се draft copy, отваря се редакция, галерията съдържа отделни копирани снимки.
5. Провери продукт със сложни опции/цветове, ако има такъв.

## Бележки

- Promo/coupon WIP в `D:\Cursor\src` не е пипан.
- Scratch файлове не са включени.
- Ако fallback-ът се активира в production, Vercel logs ще съдържат `[duplicateProduct] admin_duplicate_product failed`, което потвърждава stale/failed RPC.

## Production closure

- **PR:** #42 — merged
- **Merge commit:** `ab970ea` — Merge pull request #42 from vemidi-dev/codex/admin-product-duplicate-fallback
- **Feature commit:** `65767d8` — fix(admin): fall back when duplicate product RPC fails
- **Production deployment:** `dpl_EH3dyQtDX5ab4earEj52VBHwN2ji`
- **Production URL:** https://vemidi-store-hpvk6t8zm-ve-mi-di.vercel.app
- **Live aliases (production):**
  - https://vemidi-crafts.com
  - https://www.vemidi-crafts.com
  - https://vemidi-store.vercel.app
- **Preview QA (pre-merge):** PASS — duplicate without images, duplicate with images, draft opens for edit

### Smoke results (2026-08-30, post deploy)

| Check | Result |
|-------|--------|
| `GET /admin` unauth → 307 login | pass (no 504) |
| `GET /admin?tab=products` unauth → 307 login | pass (no 504) |
| Authenticated duplicate smoke (production) | not run — requires admin session; preview QA PASS covers duplicate without/with images |

### Notes

- Promo/coupon WIP in `D:\Cursor\src` was not touched during this deployment.
- Fallback reduces risk from stale `admin_duplicate_product` RPC; Supabase SQL migration for duplicate RPC should still be applied per store setup runbook.
