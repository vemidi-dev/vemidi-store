# Product Ordering Admin — Task Report

## Цел

Да се добави удобен admin workflow за подреждане на продуктите на **началната страница** (featured/home) и в **каталога** (`/produkti`). Решението трябва да следва съществуващите admin patterns, да е template-safe за бъдещ пренос в store-template и да не променя публичния дизайн освен където е нужно за сортирането.

## Какво беше имплементирано

- Нов admin режим **„Подредба на продукти”** под таб Products, достъпен от списъка с продукти или директно чрез URL параметри.
- Два отделни изгледа:
  - **Начална страница** — featured продукти от `home_featured_products`
  - **Всички продукти** — публикувани и публично видими продукти за каталога
- UI с thumbnail, име, slug/product code, publication badge и текуща позиция (secondary info).
- Подреждане чрез native HTML5 drag-and-drop и бутони **Най-горе / Нагоре / Надолу / Най-долу**.
- Server action `saveProductOrdering`, който записва позициите на стъпка **10, 20, 30…**
- Pure helpers в `lib/admin/product-ordering.ts` за нормализация, move логика и comparators.
- SQL миграция с ново поле `catalog_sort_order`, backfill и две admin RPC функции.
- Storefront repository сортиране на каталога по `catalog_sort_order`.
- Unit тестове за helper логиката и catalog sort behavior.

## Засегнати файлове

**Нови:**

- `components/admin/product-ordering-panel.tsx` — client UI за двата изгледа
- `lib/admin/product-ordering.ts` — reorder/save/sort helpers
- `supabase/product_catalog_sort_order.sql` — DB миграция и RPC-та
- `tests/product-ordering.test.ts` — focused unit тестове
- `docs/task-reports/2026-08-23-product-ordering-admin.md` — този report

**Променени:**

- `app/admin/actions.ts` — `saveProductOrdering` server action
- `app/admin/page.tsx` — routing за `productsView=ordering`
- `components/admin/product-list-panel.tsx` — линк „Подредба на продукти”
- `lib/admin/form-fields.ts` — полета за ordering form
- `lib/admin/types.ts` — `catalog_sort_order`, `created_at` в `ProductRow`
- `lib/storefront/mappers.ts` — `catalog_sort_order` в `ProductRow` type
- `lib/storefront/repository.ts` — catalog sort при зареждане на storefront catalog

## Данни и sort логика

### Начална страница

Използва се **съществуващата** home/featured логика:

| Елемент | Описание |
|---------|----------|
| Таблица | `public.home_featured_products` |
| Поле | `sort_order` |
| Per-product UI | „Витрина и свързани продукти” (merchandising) — checkbox + numeric position |
| Admin bulk save | RPC `admin_replace_home_featured_order(uuid[])` — заменя целия featured списък с подредени ID-та × 10 |

Storefront зарежда featured редовете ordered by `sort_order`; `app/page.tsx` показва featured продуктите в този ред.

### Каталог / всички продукти

**Преди задачата** нямаше отделно поле за catalog order — default беше `created_at DESC` (sort `featured` = „Най-нови” запазваше fetch реда).

**Добавена миграция** `supabase/product_catalog_sort_order.sql`:

| Елемент | Описание |
|---------|----------|
| Ново поле | `products.catalog_sort_order integer not null default 0` |
| Индекс | `(catalog_sort_order, created_at desc)` |
| Backfill | Продукти с `catalog_sort_order = 0` получават позиции по текущия `created_at` ред × 10 |
| Admin bulk save | RPC `admin_replace_catalog_sort_order(uuid[])` |

**Comparator логика:** продукти с `catalog_sort_order > 0` са с explicit order; `0` се третира като „unset” и отива след ordered items, после `created_at` desc.

## Admin UX

- От **Всички продукти** → бутон **„Подредба на продукти”**
- URL: `/admin?productsView=ordering&orderingScope=home|catalog`
- Табове **Начална страница** / **Всички продукти** превключват scope
- Всеки ред показва:
  - **Thumbnail** — primary gallery image или fallback `product.image_url`
  - **Име**, slug · product code
  - **Publication badge** (+ „Изчерпан” при sold out)
  - **Текуща позиция** — secondary info, не primary editor
- Drag handle (⋮⋮) + бутони за fine-grained reorder
- **Запази подредбата** → server action → revalidate на admin, home и `/produkti`
- Линк **„← Към списъка с продукти”** за връщане

**Забележка:** за начална страница продуктът първо трябва да е маркиран featured през merchandising; ordering panel само подрежда вече featured продуктите.

## Storefront поведение

### Начална страница

- `lib/storefront/repository.ts` зарежда `home_featured_products` ordered by `sort_order`
- `app/page.tsx` map-ва `featuredProductIds` към продукти и ги показва в home featured секцията
- Промяната в admin ordering директно променя featured реда на home

### `/produkti`

- `fetchStorefrontCatalog` включва `catalog_sort_order` и сортира products array с `compareCatalogSortOrder`
- Default sort `featured` в shop page запазва fetch/index реда → след admin catalog ordering, default listing следва новия ред
- Други sort опции (цена, име) не са засегнати

Публичният UI/design не е променян.

## Тестове

**Добавени** — `tests/product-ordering.test.ts` (7 теста):

- `normalizeProductSortOrders` — step 10
- `buildProductOrderSavePayload` — ID → sort order mapping
- move helpers (up/down/top/bottom)
- `parseOrderedProductIds` — dedupe + preserve order
- `compareHomeFeaturedSortOrder`
- `compareCatalogSortOrder` + catalog listing sort integration

**Пуснати команди (първоначално):**

```bash
npm run typecheck                                    # PASS
npx tsx --test tests/product-ordering.test.ts      # 7/7 PASS
npx tsx --test tests/canonical-produkti-route.test.ts tests/shop-seo-route.test.ts  # 45/45 PASS
```

**Финална проверка (2026-08-23, след изпълнение на SQL миграцията):**

```bash
npm run typecheck                                                                 # PASS
npx tsx --test tests/product-ordering.test.ts                                   # 7/7 PASS
npx tsx --test tests/canonical-produkti-route.test.ts \
             tests/shop-seo-route.test.ts \
             tests/category-related-storefront.test.ts                          # 54/54 PASS
```

Linter/imports: няма открити проблеми в засегнатите admin/storefront файлове.

## Статус на SQL миграцията

**Изпълнена ръчно в Supabase** — `supabase/product_catalog_sort_order.sql` (поле `catalog_sort_order`, backfill, RPC `admin_replace_home_featured_order` и `admin_replace_catalog_sort_order`).

## Ограничения / следващи стъпки

1. ~~**SQL миграцията трябва да се изпълни ръчно в Supabase**~~ — **готово** (2026-08-23).
2. **Home ordering не добавя/премахва featured продукти** — само подрежда съществуващите; добавянето остава през per-product merchandising.
3. **Catalog ordering panel** показва само published + `visibility=public` продукти; save обновява само изпратените ID-та.
4. **Template transfer** — функционалността е написана template-safe; пренос в `D:\store-template` е отделна задача (не е част от този report).
5. **Commit/deploy** — промените са локални/uncommitted; commit и production deploy по желание на екипа.

## Pre-commit review

*(2026-08-24 — code review преди commit)*

### Какво беше проверено

| Област | Резултат |
|--------|----------|
| **Git status / task files** | 7 modified + 5 task untracked; scratch `.tmp-*` / `.codex-handoff.md` изключени |
| **`saveProductOrdering` auth** | Използва `getAuthorizedClient()` (session + `checkIsAdmin`); RPC-тата викат `assert_admin()` — същият pattern като `moveCategory` |
| **Home ordering scope** | UI показва само продукти от `featuredProductById`; save заменя целия `home_featured_products` списък; празен save е блокиран в UI и action |
| **Catalog ordering scope** | UI филтрира `published` + `isProductCatalogVisible`; save обновява само изпратените ID-та чрез RPC |
| **Drag/drop + fallback** | Native DnD + 4 бутона (Най-горе/Нагоре/Надолу/Най-долу); `flex-wrap` на mobile; submit с `useTransition` |
| **Thumbnails** | Primary gallery → `product.image_url` → placeholder „—“ при липса на снимка |
| **`/produkti` default sort** | `sort=featured` запазва `index` от repository; repository сортира по `compareCatalogSortOrder`; price/name sort непроменени |
| **SQL idempotency** | `IF NOT EXISTS` за column/index; backfill само при `catalog_sort_order = 0`; `CREATE OR REPLACE` за RPC; grants idempotent |
| **Тестове** | 7 unit теста покриват step-10, move helpers, parse IDs, home/catalog comparators и catalog listing sort |
| **Imports/types** | Typecheck и linter без грешки в засегнатите файлове |

### Пуснати команди

```bash
npm run typecheck                                                                 # PASS
npx tsx --test tests/product-ordering.test.ts                                   # 7/7 PASS
npx tsx --test tests/canonical-produkti-route.test.ts \
             tests/shop-seo-route.test.ts \
             tests/category-related-storefront.test.ts                          # 54/54 PASS
```

### Remaining risks (приемливи, без code fix)

1. **Home save е replace-all** — при save featured списъкът се заменя изцяло; нормален UI flow изпраща всички featured продукти.
2. **Няма server-side re-validation на scope** — action-ът не проверява повторно дали ID-тата са featured/catalog-visible (admin-only; RPC валидира само съществуващи продукти).
3. **Новопубликуван продукт** — може да получи backfill/`0` позиция до следващ catalog save от admin.
4. **Нес записен scope switch** — смяна home ↔ catalog без save губи локални промени.
5. **Mobile DnD** — целият `<li>` е draggable; fallback бутоните покриват случаи, когато drag е неудобен на touch.
6. **Home panel не добавя featured** — добавяне/премахване остава в per-product merchandising.

### Заключение от review-а

**Няма блокиращи проблеми.** Промените са готови за commit. Код не е променян по време на review-а (само този report).

---

## Git status summary

*(pre-commit review: 2026-08-24)*

**Modified (7):** `app/admin/actions.ts`, `app/admin/page.tsx`, `components/admin/product-list-panel.tsx`, `lib/admin/form-fields.ts`, `lib/admin/types.ts`, `lib/storefront/mappers.ts`, `lib/storefront/repository.ts`

**Untracked — task-related (5):** `components/admin/product-ordering-panel.tsx`, `lib/admin/product-ordering.ts`, `supabase/product_catalog_sort_order.sql`, `tests/product-ordering.test.ts`, `docs/task-reports/2026-08-23-product-ordering-admin.md`

**Untracked — scratch (изключени):** `.tmp-*`, `.codex-handoff.md` и други временни файлове — не са част от задачата.

**Branch:** `main`. Feature промените **не са commit-нати**.

**Заключение:** Pre-commit review мина успешно. SQL миграцията е приложена в Supabase. Готово за commit по желание.
