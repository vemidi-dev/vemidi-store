# Admin Products Performance — анализ и план

Дата: 2026-08-29  
Проект: `D:\Cursor\src` (vemidi-store)  
Статус: **Stage 1–2 implemented** (виж §12) — analysis + implementation  
Template: **не е пипан**  
Deploy: Preview only (не production)  
Локален WIP `promo_code_eligible`: **запазва се отделно** (не се смесва)

Свързани документи:

- `docs/task-reports/2026-08-29-admin-timeout-fix.md` — emergency default tab → orders
- `docs/PRE_PRODUCTION_AUDIT.md` — D1 / D2 / D7 / D10, Пакет 2 Admin scaling

---

## 1. Текущ проблем

### Симптом

- Bare `/admin` timeout-ваше с Vercel 504 (`FUNCTION_INVOCATION_TIMEOUT` 60s).
- Минималният fix пренасочи default tab към **orders**.
- **`/admin?tab=products`** и **`/admin?tab=categories`** все още викат общия `loadAdminData()` и могат да timeout-ват или да пратят огромен RSC payload.

### Какво прави `loadAdminData()` днес

`lib/admin/data.ts` — **един** `Promise.all` с ~24 unbounded selects + variant/materials follow-up:

| Query | Бележка |
|-------|---------|
| `products.select("*")` | всички продукти |
| `categories` (широк select) | всички категории |
| `product_categories` | всички връзки |
| `color_groups` / `color_options` | глобални lookup |
| `product_color_fields` + `product_color_field_options` | **всички** продукти |
| `product_images` | **всички** галерии |
| `product_personalization_fields` | всички |
| `wish_templates` + occasions + `product_wish_templates` | |
| `home_featured_products` | |
| `related_products` | всички |
| `product_upsell_offers` + settings | всички |
| `category_related_categories` | |
| `product_option_groups` + `product_option_values` | всички |
| `product_landing_pages` | всички |
| FAQ groups/items + product FAQ links | всички |
| materials / variant groups | |

Познат риск (PRE_PRODUCTION_AUDIT **D10**): PostgREST **~1000-row cap** → silent truncation на child tables.

### Какво правят текущите „филтри“

В `ProductListPanel` + `AdminListControls`:

1. Сървърът зарежда **всички** продукти + child maps.
2. Сървърният RSC рендер обхожда **всеки** продукт и подава **пълната edit форма** като `children` на `AdminLazyDetailsMount` (client).
3. `AdminListControls` е **client-side**:
   - търсене по `data-search` (име, цена, имена на категории)
   - филтри по `data-filter-status` / `data-publication-status` / category ids
   - sort по dataset attributes
   - „pagination“ = `visibleLimit` (hide в DOM), **не** намалява server payload

`AdminLazyDetailsMount` отлага само **client mount** на отворен `<details>`. **Не** намалява:

- времето на `loadAdminData`
- размера на RSC/flight payload (children се сериализират от сървъра)
- PostgREST volume

Заключение: днешните филтри/пагинация са UX върху вече заредени данни — **не** са server-side.

---

## 2. Разбивка: какви данни трябват за всяка повърхност

### A. Product list (компактен ред)

Нужни за ред + филтриращи chip-ове (без edit editors):

| Поле / източник | Защо |
|-----------------|------|
| `id`, `name`, `slug`, `product_code`, `price` | идентичност, линкове, търсене |
| `status`, `visibility`, `is_sold_out`, `is_customizable` | status badges / availability filter |
| `fulfillment_type`, `stock_quantity` | fulfillment label |
| `image_url` или primary gallery thumb | thumbnail |
| category ids (+ type) | category filters / chips |
| featured? (`home_featured_products`) | „На началната“ filter |
| `created_at` / `catalog_sort_order` | sort |

**Не** са нужни за list: option groups/values, personalization fields, full gallery, upsells, landing pages, FAQ associations, related products, color field configs.

### B. Product create (lookup only)

От `ProductCreatePanel` props:

| Lookup | Употреба |
|--------|----------|
| `categories` | checkbox-и + primary SEO category |
| `colorGroups` + `colorOptions` | color fields editor |
| `materials` + `variantGroups` | option/material editors |
| `wishes` + `wishOccasionLinks` | wish selector |
| `faqProductGroups` + `faqItems` | FAQ attach |

**Не** зарежда: products list, per-product child tables, images, upsells, landing pages, related products, featured map.

### C. Product edit (един продукт)

От edit секциите в `ProductListPanel` (при отворен продукт):

| Данни | Употреба |
|-------|----------|
| пълен `ProductRow` | основна форма |
| assigned category ids | categories |
| color fields + selected option ids | color editor |
| gallery images | gallery CRUD |
| personalization fields | editor |
| option groups + values | options editor |
| wish template ids | wishes |
| FAQ group/item ids | FAQ |
| related product ids | merchandising picker |
| upsell offers + settings | upsell editor |
| landing pages for product | landing panel |
| featured flag / merchandising | home featured |
| **related picker catalog** | днес: `buildPromotionProductOptions(all products…)` — проблем: иска списък от продукти |

За related/upsell pickers: нужен е **лек product picker dataset** (id, name, price, categories, sold_out), не пълни edit payloads. Може отделен `loadAdminProductPickerOptions()` (или paginated search endpoint по-късно).

### D. Product ordering (`?productsView=ordering`)

От `ProductOrderingPanel`:

- products: id, name, visibility, is_sold_out, catalog_sort_order, created_at
- primary/thumbnail image
- `home_featured_products` за home scope

**Не** са нужни: options, FAQ, upsells, full galleries, color fields.

### E. Categories tab

От `CategoryManagementPanel` + `buildProductCountByCategoryId`:

- `categories` (пълен CMS select)
- `product_categories` → counts only (или `count` aggregate)
- `category_related_categories`

**Не** трябва да вика пълния `loadAdminData`.

---

## 3. Предложена архитектура

Разделяне на loaders (по модел на `loadOrdersPage` в `lib/admin/orders.ts`):

```text
/admin?tab=products
  ├─ loadAdminProductLookups()     // create + filter dropdowns (categories, colors, …)
  ├─ loadAdminProductsPage(query)  // slim page of list rows + total count
  └─ if editProduct:
       loadAdminProductEditBundle(id)  // one product + its children
       (+ loadAdminProductPickerOptions() slim, optional cache)

/admin?productsView=ordering
  └─ loadAdminProductOrderingData(scope)

/admin?tab=categories
  └─ loadAdminCategoriesData()     // categories + counts + related
```

### 3.1 `loadAdminProductsPage(query)`

Server filters + pagination в Supabase:

| Param | Поведение |
|-------|-----------|
| `q` | `ilike` върху `name`, `slug`, `product_code` (sanitized; без uuid `.ilike`) |
| `category` | join/filter през `product_categories` (един category id; продукт в много категории остава match ако има връзката) |
| `status` | `products.status` (`draft` / `published` / `archived`) |
| `availability` (optional phase 2) | sold-out / featured / customizable — featured изисква join към `home_featured_products` |
| `page`, `page_size` | `.range()` + exact/estimated count |
| `sort` | name / price / created_at |

Default: `page=1`, `page_size=30` (като днешния client pageSize).

List row select: тесни колони + optional primary image (от `image_url` или 1 query за thumbs на page ids).

Category chips за page: `product_categories` **само** за ids на текущата страница.

### 3.2 `loadAdminProductLookups()`

Еднократни глобални таблици за create + filter option lists. Малки / средни таблици; безопасни за пълен load (за разлика от per-product children).

### 3.3 `loadAdminProductEditBundle(productId)`

При `editProduct=<uuid>`:

1. Validate uuid; 404/notice ако липсва.
2. Load product row.
3. Parallel child queries **scoped** с `.eq("product_id", id)` / `.in("group_id", …)`.
4. Не зареждай children за други продукти.

UI: вместо N× full forms в list → **един** edit panel (или route segment) за `editProduct`. List редовете са само header + „Редакция“ линк, който задава URL params.

`AdminLazyDetailsMount` може да остане за секции **в** edit формата, но не като заместител на server lazy load.

### 3.4 Categories / ordering

Отделни entry points в `app/admin/page.tsx` (early return като orders/content), **без** `loadAdminData`.

Дългосрочно: deprecate / delete монолитния `loadAdminData` или го остави като thin wrapper за legacy тестове.

---

## 4. URL params (предложение)

База: `/admin?tab=products`

| Param | Тип | Бележки |
|-------|-----|---------|
| `q` | string | search |
| `category` | uuid | една категория (product/material/occasion id) |
| `status` | `draft` \| `published` \| `archived` \| `` | publication |
| `page` | int ≥ 1 | |
| `page_size` | int (напр. 10–100, default 30) | |
| `editProduct` | uuid | отваря edit bundle |
| `productsView` | `ordering` \| `` | запазва се |
| `orderingScope` | `home` \| `catalog` | при ordering |
| `success` / `error` | notices | както днес |

**Запазване на филтри след edit/save:**

- `redirectWithProductEdit` / list redirects да **запазват** `q`, `category`, `status`, `page`, `page_size` (подобно на orders `buildOrdersHref`).
- Helper: `makeAdminProductsHref({ …partial })`.

Client `AdminListControls` за products list → да се замени с **GET form / Link** към същите query params (като orders panel), не с DOM hide.

Опционално phase 2: `availability`, `sort` като URL params.

---

## 5. Конкретни файлове за промяна (implementation фаза)

| Файл | Роля |
|------|------|
| `lib/admin/data.ts` | разбиване / нови loaders; стесняване или премахване на монолита |
| **нов** `lib/admin/products-query.ts` (име по избор) | `parseProductsQuery`, `loadAdminProductsPage`, href builder |
| **нов** `lib/admin/product-edit-data.ts` | `loadAdminProductEditBundle` |
| **нов** `lib/admin/product-lookups.ts` | create/filter lookups |
| **нов** `lib/admin/categories-data.ts` | categories tab loader |
| `app/admin/page.tsx` | early returns; wire loaders by view |
| `components/admin/product-list-panel.tsx` | slim list + single edit host |
| `components/admin/product-create-panel.tsx` | само lookups props (без `AdminData`) |
| `components/admin/product-ordering-panel.tsx` | slim ordering data type |
| `components/admin/admin-list-controls.tsx` | products: URL-driven controls **или** отделен `ProductListControls` |
| `app/admin/actions.ts` | redirects запазват list query |
| `lib/admin/seo-overview.ts` / edit links | `editProduct` + запазени filters |
| тестове | виж §7 |

**Не пипай в тази задача (освен ако edit bundle select трябва да чете колоната след SQL):** promo/coupon/cart файлове от `promo_code_eligible` WIP.

---

## 6. Етапи на implementation

### Етап 0 — изолация на WIP (преди код)

1. `promo_code_eligible` локалните промени остават uncommitted **или** на отделен stash/branch.
2. Нова branch от чист `origin/main` (където timeout fix вече е merged).
3. Не commit-вай `.tmp-*`, `.codex-handoff.md`, coupon/SQL promo файлове.

### Етап 1 — Categories escape hatch (малък, висок ефект)

- Early return за `tab=categories` с лек loader.
- Премахва categories от `loadAdminData` path → по-малко 504 риск.

### Етап 2 — Products list pagination + server search/filter

- `parseProductsQuery` + `loadAdminProductsPage`.
- Slim list UI + URL controls.
- Create panel на lookups-only.
- **Edit forms още не са lazy** (може временно да липсват inline editors или да са „отвори за редакция“ → Етап 3).

Препоръка: Етап 2 list **без** да сериализира N edit forms (дори празни placeholders) — линк към `editProduct`.

### Етап 3 — Lazy edit bundle

- `loadAdminProductEditBundle(editProduct)`.
- Един edit panel под/до list.
- Picker options: slim catalog query (не full `AdminData`).
- Redirects запазват filters.

### Етап 4 — Ordering slim loader

- Отделен data path за `productsView=ordering`.

### Етап 5 — Cleanup

- Премахни/ограничи `loadAdminData`.
- Документирай PostgREST scoping (`.eq` / `.in`) за child queries.
- Обнови `docs/admin-panel.md` + PRE_PRODUCTION_AUDIT checkbox за D1/D2.

---

## 7. Тестове (за implementation фазата)

| Тест | Какво покрива |
|------|----------------|
| `parseProductsQuery` | defaults, clamp `page_size`, sanitize `q`, invalid uuid `category`/`editProduct` |
| `loadAdminProductsPage` (mocked supabase) | range bounds; status filter; search filter builder; category filter |
| `makeAdminProductsHref` | запазва `q`/`status`/`page` при добавяне на `editProduct` |
| List panel / page wiring | без `editProduct` → **не** вика edit bundle; с `editProduct` → вика |
| Edit bundle scoping | child queries съдържат product id predicate (unit или contract test върху query builders) |
| Categories loader | не дърпа `product_option_values` / images |
| Regression | orders/content tabs непроменени |
| Optional integration | при N fixtures, list payload не включва option group rows |

Съществуващи reference patterns: `tests` около `parseOrdersQuery` / `loadOrdersPage` helpers.

---

## 8. Рискове

| Риск | Детайл | Митигация |
|------|--------|-----------|
| Продукт в много категории | Filter по една `category` трябва `INNER`/`IN` през `product_categories`, не да „реже“ другите assigned ids в edit | Edit bundle зарежда **всички** category links за продукта; list filter е membership |
| Edit зависимости | Option groups/values, color fields, upsells, landing, FAQ — много таблици | Един bundle с parallel scoped queries; ясен loading/error UI |
| Pagination + search | Client и server filters да не се дублират/разминават | Премахни DOM filter за products; само URL/server |
| Запазване на филтри след edit | Днес redirects често са `tab=products&editProduct=` без `q`/`page` | Централен href builder във всички product redirects |
| Related/upsell picker | Днес ползва всички products | Slim picker query; по-късно search-as-you-type |
| Featured / customizable filters | По-сложни от `status` | Phase 2 URL params или client-only върху **текущата page** (по-слабо) — предпочитай server |
| PostgREST 1000 cap | Остава ако някой query е unbounded | Scoped queries; count отдельно; monitor |
| RSC payload | Дори „lazy details“ сериализира children | Не подавай full forms за non-edited products |
| Timeout на products tab по време на миграция | Половинчато състояние | Етап 1+2 първо; feature flag не е задължителен ако branch е малък |
| **Смесване с `promo_code_eligible`** | Колона/select в edit/list може да се преплете | Виж §9 |

---

## 9. Как да се пазят `promo_code_eligible` промените отделно

Текущ локален WIP (не за тази задача): SQL, coupon math, cart snapshot, admin checkbox, terms copy, tests.

Правила:

1. **Тази задача = analysis only** (този документ). Няма commit/deploy.
2. Implementation на performance → **нова branch от `origin/main`**, без promo файлове в diff.
3. Ако edit/list select трябва да включи `promo_code_eligible` **след** като SQL е приложен и promo PR е merged — добави колоната тогава; дотогава не блокирай pagination на promo.
4. Не ползвай един commit/PR за „timeout/performance + promo“.
5. Scratch: `.tmp-*`, `.codex-handoff.md` — никога в PR.
6. При нужда от чиста working tree: `git stash push` само на promo пътища, или worktree (както при admin timeout fix).

---

## 10. Препоръчан ред (след approve на плана)

1. Етап 1 categories loader (бърз win).  
2. Етап 2 list pagination + URL filters + lookups create.  
3. Етап 3 edit bundle + filter-preserving redirects.  
4. Етап 4 ordering.  
5. Етап 5 delete monolith + docs.  
6. Отделно: `promo_code_eligible` SQL → app PR → deploy (не в този поток).

---

## 11. Извън обхват (този анализ)

- Storefront `/shop` pagination (PRE_PRODUCTION D3)
- Product CSV import
- Template port
- Implementation / Vercel deploy / git commit (виж §12 за Stage 1–2)

---

## 12. Implementation Stage 1–2

Дата: 2026-08-29  
Branch / worktree: `feat/admin-products-performance-stage-1-2` (`D:\Cursor\src-admin-products-perf`)  
База: `origin/main` (admin timeout fix вече merged)  
Deploy: **Vercel Preview only** (не production)  
Merge: **чака потвърждение**

### Какво е направено

**Stage 1 — Categories**

- Нов лек loader `loadAdminCategoriesData()` — само `categories`, `product_categories` (counts), `category_related_categories`.
- `/admin?tab=categories` early-return в `app/admin/page.tsx` — **не** вика `loadAdminData()`.

**Stage 2 — Products list / create / scoped edit**

- `parseProductsQuery` + `makeAdminProductsHref` + `loadAdminProductsPage`:
  - URL: `q`, `category`, `status`, `page`, `page_size` (default **30**, max **100**)
  - slim product rows + category links / featured **само за текущата страница**
- `ProductListSlimPanel` — server-driven list UI (GET filters + pagination links)
- `loadAdminProductLookups()` — create форма + filter dropdowns без child tables
- `loadAdminProductEditBundle(editProduct)` + `ProductListPanel editOnly` — **един** продукт с scoped children (не N full forms в списъка)
- `productsView=ordering` все още ползва `loadAdminData` (Stage 4)

### Променени / нови файлове

| Файл | Роля |
|------|------|
| `lib/admin/categories-data.ts` | Stage 1 loader |
| `lib/admin/product-lookups.ts` | create/filter lookups |
| `lib/admin/products-query.ts` | parse / href / slim page loader |
| `lib/admin/product-edit-data.ts` | scoped edit bundle |
| `components/admin/product-list-slim-panel.tsx` | list UI |
| `components/admin/product-list-panel.tsx` | `editOnly` mode |
| `app/admin/page.tsx` | wiring |
| `tests/admin-products-query.test.ts` | parse + href |
| `tests/admin-categories-loader.test.ts` | categories path contract |

### Какво остава за Stage 3+

| Stage | Работа |
|-------|--------|
| **3** | По-лек edit UX (по-малък picker за related/upsell; redirects да запазват `q`/`page`/`category`/`status`; евентуално отделен edit route) |
| **4** | Slim loader за `productsView=ordering` (без monolith) |
| **5** | Cleanup / ограничаване на `loadAdminData`; docs (admin-panel, PRE_PRODUCTION D1/D2) |

Бележка: Stage 2 включва **безопасен** scoped edit bundle (за да няма загуба на данни при редакция). Пълният lazy-edit polish (по-малък picker payload, filter-preserving redirects навсякъде) е Stage 3.

### Тестове

- `tests/admin-products-query.test.ts` — defaults, clamp, sanitize, href запазва filters
- `tests/admin-categories-loader.test.ts` — categories не минава през тежкия product path
- `npm run typecheck`
- релевантни unit tests (`npm test -- tests/admin-products-query.test.ts tests/admin-categories-loader.test.ts`)

### Рискове

| Риск | Митигация / статус |
|------|-------------------|
| Edit picker още зарежда slim rows за **всички** продукти (имена за related/upsell) | По-леко от monolith; Stage 3 → search picker |
| Ordering tab все още може да timeout-не | Остава на Stage 4 |
| Product redirects още не пазят list filters | Edit URL остава `tab=products&editProduct=`; Stage 3 |
| PostgREST search `.or(ilike…)` | sanitize като при orders |
| Смесване с promo WIP | Worktree от `origin/main`; promo файлове **не** са в diff |

### Deploy

- Production: **не**
- Preview: **да** — PR [#30](https://github.com/vemidi-dev/vemidi-store/pull/30)
  - Preview URL: https://vemidi-store-git-feat-admin-products-performanc-b0719d-ve-mi-di.vercel.app
  - Unauth smoke: `/admin?tab=products|categories` (+ filter params) → **307** към login (без 504)
  - Authenticated list/edit smoke: **ръчно** след login
- Merge: само след ръчно потвърждение

---

## 13. Stage 1-2 UX revision

Дата: 2026-08-29 (follow-up на preview feedback)

### Products UX fixes

- Филтрите се прилагат **onChange** (без „Приложи“); search с debounce **400ms**; при промяна `page` → 1.
- Отделни server-side dropdown-и: Категория / Заготовки и материали / Повод (+ Наличност, Статус, Сортиране).
- AND match през `product_categories` когато са избрани няколко типа.
- Publish / sold-out actions пазят list query params и добавят `_refresh` + success message.

### Categories UX fixes

- „Затвори редакцията“ → `/admin?tab=categories` (+ `categoryType`); edit през `editCategory` URL.
- Create/update/move връщат `{ href }` + client `router.push/refresh` (избягва stuck pending след redirect).
- Related checkboxes: stopPropagation + коректен material/occasion type resolve.
- По-силна `revalidatePath` за categories; panel `key` от success/error/`_refresh`.

### Tests

- `tests/admin-products-query.test.ts` — typed filters, href, categories href
- `tests/admin-categories-loader.test.ts`
- `tests/category-related-selector.test.ts`
- `npm run typecheck`

### Preview

- Preview (branch alias): https://vemidi-store-git-feat-admin-products-performanc-b0719d-ve-mi-di.vercel.app
- Commit: `021cb7c` на PR [#30](https://github.com/vemidi-dev/vemidi-store/pull/30)
- Unauth smoke: `/admin?tab=products` и `/admin?tab=categories` → **307** login (без 504)
- Authenticated checklist: products onChange filters; category type AND; publish refresh; categories close/move/save/create + related checkboxes

### Преди merge

- Authenticated smoke на preview.
- Потвърждение от product owner.
- **Не merge без потвърждение.**

### Residual risk (Stage 4)

- `productsView=ordering` още ползва `loadAdminData` → възможен timeout при много продукти.

---

## 14. Categories blocking bug fix

Дата: 2026-08-29

### Причина

1. **Редакция:** `Редакция` сменяше URL с `editCategory`, но отварянето разчиташе на `useEffect` + `getElementById` **преди** tab/DOM да са готови; `<details>` нямаше контролиран `open`.
2. **Move up/down:** UX revision мина към client `CategoryRedirectingForm` + `{ href }` return вместо стандартния admin `redirect()`. Това беше нестабилно (няма надежден refresh/success UI).

### Fix

- Върнати **server action `redirect()`** за create/update/move (`redirectToCategories` + `makeAdminCategoriesHref` с `success`/`_refresh`/`categoryType`).
- Премахнат `CategoryRedirectingForm`.
- Edit: `open={editCategoryId === category.id ? true : undefined}`, active tab init от `editCategoryId`, rAF scroll/open, edited row остава visible при search.
- „Затвори редакцията“ → href без `editCategory`.
- Lightweight `loadAdminCategoriesData` запазен.

### Тестове

- `tests/admin-categories-edit-move.test.ts`
- `npm run typecheck`
- categories/products/related selector unit tests

### Preview

- PR [#30](https://github.com/vemidi-dev/vemidi-store/pull/30)
- Branch alias: https://vemidi-store-git-feat-admin-products-performanc-b0719d-ve-mi-di.vercel.app

### Ръчен checklist

- [ ] `Редакция` отваря формата и URL има `editCategory`
- [ ] `Затвори редакцията` маха `editCategory` и затваря формата
- [ ] ↑/↓ сменят реда + success banner + видим нов `home_sort_order`
- [ ] Create/update category завършват без stuck pending
- [ ] Няма 504 на `/admin?tab=categories`

---

## 15. Categories authenticated UI bug - second fix

Дата: 2026-08-29

### Причина

Authenticated preview тестът показа, че първият fix не е достатъчен:

- `Редакция` все още не отваряше надеждно формата.
- ↑/↓ не даваха надежден видим refresh.

Основният проблем беше, че edit UI все още живееше във всеки ред като
`<details>` и разчиташе на URL + client state/effect. Това оставяше твърде
много възможности за разминаване между tab state, DOM и hydrated client UI.

### Fix

- Edit формата вече е **отделен видим панел** над списъка, когато URL има
  `editCategory=<id>`.
- Редовете в списъка вече съдържат само actions: ↑, ↓ и `Редакция`.
- `Редакция` е обикновен `Link` към
  `/admin?tab=categories&categoryType=<type>&editCategory=<id>`.
- `Затвори редакцията` маха `editCategory` и връща към същия category type.
- Премахната е зависимостта от `requestAnimationFrame`, `getElementById` и
  отваряне на `<details>` за edit form.
- Move/create/update остават със server action `redirect()` + `_refresh` +
  success/error message.
- Lightweight `loadAdminCategoriesData` остава запазен.

### Тестове

```text
npm run typecheck → pass
npx tsx --test tests/admin-categories-edit-move.test.ts tests/admin-categories-loader.test.ts tests/admin-products-query.test.ts tests/category-related-selector.test.ts → 25/25 pass
```

### Ръчен checklist за нов preview

- Latest preview deployment: https://vemidi-store-b8tdssgxh-ve-mi-di.vercel.app
- Branch alias: https://vemidi-store-git-feat-admin-products-performanc-b0719d-ve-mi-di.vercel.app
- Unauthenticated smoke: `/admin?tab=categories` и `/admin?tab=products` → 307 login, без 504.

- [ ] `Редакция` показва отделния edit panel и URL има `editCategory`
- [ ] `Затвори редакцията` маха `editCategory`
- [ ] ↑/↓ сменят реда + success banner + видим нов ред
- [ ] Create/update category завършват без stuck pending
- [ ] Related category checkboxes при нова категория могат да се избират
- [ ] Няма 504 на `/admin?tab=categories`

---

## 16. Categories actions - server-rendered fallback

Дата: 2026-08-29

### Причина

Authenticated preview тестът отново показа, че `Редакция` и стрелките ↑/↓
не реагират надеждно. Тъй като проблемът засяга едновременно линк и форми,
най-вероятната зона вече не е самият redirect, а client-side слоят на
`CategoryManagementView` - state, hydration или обработка на кликове.

### Fix

- `CategoryManagementView` вече е server component, без `"use client"`,
  `useState`, `useEffect` или `useMemo`.
- Табовете са обикновени `<a href>` линкове към
  `/admin?tab=categories&categoryType=<type>`.
- `Редакция` е обикновен `<a href>` към
  `/admin?tab=categories&categoryType=<type>&editCategory=<id>`.
- Search в категориите е GET form с `category_q`, вместо client state.
- Move ↑/↓ остават стандартни server action форми с `redirect()` в actions.
- Edit формата остава отделен server-rendered panel над списъка.
- `app/admin/page.tsx` подава `category_q` към `CategoryManagementPanel`.

### Проверки

```text
npm run typecheck → pass
npx tsx --test tests/admin-categories-edit-move.test.ts tests/admin-categories-loader.test.ts tests/admin-products-query.test.ts tests/category-related-selector.test.ts → 25/25 pass
```

### Ръчен checklist за preview

- Latest preview deployment: https://vemidi-store-ld65to1w8-ve-mi-di.vercel.app
- Branch alias: https://vemidi-store-git-feat-admin-products-performanc-b0719d-ve-mi-di.vercel.app

- [ ] `Редакция` навигира до URL с `editCategory` и показва edit panel
- [ ] `Затвори редакцията` маха `editCategory`
- [ ] ↑/↓ изпращат server action, сменят реда и показват success banner
- [ ] Search в категории работи през URL `category_q`
- [ ] Няма 504 на `/admin?tab=categories`

---

## 17. Category save stuck pending

Дата: 2026-08-29

### Симптом

След структурния fix `Редакция` вече се отваря, но при `Запази` формата
остава визуално в pending състояние и не се вижда redirect/success.

### Fix

- Премахнат е `AdminFormPendingGuard` от category create/update формите.
- Причина: guard-ът закача `beforeunload` докато формата е pending, което е
  полезно при големи upload-и, но при server action redirect може да блокира
  или да направи навигацията невидима за потребителя.
- Оставен е `AdminSubmitButton` с pending label, така че има обратна връзка,
  но няма `beforeunload` handler върху category save flow.

### Проверки

```text
npm run typecheck → pass
npx tsx --test tests/admin-categories-edit-move.test.ts tests/admin-categories-loader.test.ts tests/category-related-selector.test.ts → 15/15 pass
```
