# Pre-production audit — VeMiDi crafts

**Проект:** `D:\Cursor\src`  
**Дата:** 12 юни 2026  
**Режим:** READ-ONLY анализ (без редакции на код, SQL, commit или push от одита)

**Контекст:** Next.js магазин със Supabase, централен checkout, Econt/Speedy, админ панел, продуктови опции, landing campaign handoff, Vercel deployment и оптимизация на изображенията.

**Важен контекст:** В working tree има **некомитнати промени** за SEO slug + product code (37+ файла). Свързаната Supabase база **още няма** колона `products.slug` — потвърдено от `npm run supabase:check`. Кодът и production DB са **несинхронизирани**.

---

## A. Executive summary

Магазинът е функционален за малък каталог: checkout със сървърно ценообразуване, idempotency, rate limiting, Econt lookup, админ панел, опции, персонализация, промоции, имейли (Resend), campaign attribution. Автоматизираните проверки минават (177 теста, lint, typecheck, build).

**Преди live има три критични блокера:**

1. **Несъответствие код ↔ база** — slug/code миграцията (#34) не е приложена; deploy на текущия код ще счупи каталога и checkout.
2. **Мащабиране на админ и storefront** — целият каталог се зарежда без server pagination; админът рендерира всички продукти с пълни форми в DOM; PostgREST лимит ~1000 реда заплашва child таблици.
3. **Production readiness** — липсват product lifecycle статуси (draft/hidden), soft delete, CSV import/export за продукти, error monitoring, health endpoint.

За **10–50 продукта** и временен Vercel домейн магазинът може да работи след синхронизация на миграция #34. За **200+ продукта** админът и `/shop` изискват рефактор преди масово въвеждане.

---

## B. Готово за production

| Област | Статус | Доказателство |
|--------|--------|---------------|
| UUID идентификатори | Реализирано | `products.id uuid` — `supabase/products_table.sql`; `lib/catalog.ts` |
| Sold-out (продукт + опции) | Реализирано | `is_sold_out` — `supabase/product_sold_out.sql`, `universal_product_options.sql`; checkout блокира — `create_store_order` |
| Timestamps | Реализирано | `created_at`, `updated_at` — `products_table.sql` |
| Order snapshot (име, цени, опции, персонализация) | Реализирано | `create_store_order` — `supabase/universal_product_options.sql` |
| Дублиране на продукти | Реализирано | `admin_duplicate_product` — `supabase/duplicate_product.sql`; `ProductDuplicateButton` |
| Свързани продукти | Реализирано | `related_products` — `supabase/product_merchandising.sql`; `ProductMerchandisingFields` |
| Featured products | Реализирано | `home_featured_products`; `app/page.tsx` |
| Категории и поводи | Реализирано | `category_type` — `supabase/category_types.sql` |
| Варианти и доплащания | Реализирано | `product_option_groups/values` — `universal_product_options.sql` |
| Персонализация | Реализирано | `product_personalization_fields`; `lib/checkout-personalization.ts` |
| Промоции | Реализирано | `product_promotions`; `PromotionManagementPanel` |
| Изображения + alt | Реализирано | `product_images.alt_text`; `ProductDetailGallery` |
| Checkout: сървърна цена | Реализирано (DB) | RPC презарежда цени от `products` — `create_store_order` |
| Idempotency + double-submit | Реализирано | `store_order_requests`; `checkout-panel.tsx` (`idempotencyKey`, disabled submit) |
| Rate limiting | Реализирано | `check_store_checkout_rate_limit`; `app/checkout/actions.ts` |
| Econt API + fallback | Реализирано | `components/checkout/checkout-delivery-fields.tsx`, `/api/shipping/econt/*` |
| Campaign attribution | Реализирано | `lib/campaign-attribution.ts`, `campaign_order_attribution.sql` |
| Admin auth (actions/RPC/export) | Реализирано | `checkIsAdmin` — `lib/supabase/admin-auth.ts`; `app/admin/page.tsx` |
| RLS (основни таблици) | Реализирано | Множество `enable row level security` — `supabase/*.sql` |
| CSV formula injection (orders/subs) | Реализирано | `escapeCsvCell` — `lib/admin/orders.ts` |
| Image profiles + WebP output | Реализирано | `lib/images/profiles.ts`, `process-image.ts` |
| SEO: robots, sitemap, canonical, OG | Реализирано (основно) | `app/robots.ts`, `app/sitemap.ts`, product/blog metadata |
| Product JSON-LD | Реализирано (в кода) | `app/products/[slug]/page.tsx` |
| Orders admin pagination | Реализирано | `loadOrdersPage` — `lib/admin/orders.ts` |
| Upload rollback при create | Реализирано | `deleteProductAtomic` при failed upload — `app/admin/actions.ts` |
| Env validation script | Реализирано | `scripts/check-env.mjs` |
| Deployment checklist | Реализирано | `docs/DEPLOYMENT.md` |

---

## C. Частично реализирано

### Продуктов модел

| Точка | Статус | Доказателство | Защо е важно | Препоръчано действие | Размер | Изпълнител | SQL? | Преди продукти? | Преди live? |
|-------|--------|---------------|--------------|----------------------|--------|------------|------|-----------------|-------------|
| SEO slug | Частично | Код: `lib/product-slug.ts`, `lib/product-route.ts`, `supabase/product_slug_and_code.sql` (#34). DB: `supabase:check` → `products.slug does not exist` | URL-и, SEO, sitemap | Apply миграция #34 + deploy | M | Codex + Cursor | Да | Не | **Да** |
| Product code (VM-000001) | Частично | Същата миграция; `ProductSeoFields`, order snapshot в SQL v5 | Поддръжка, търсене | Същото | M | Codex + Cursor | Да | Не | **Да** |
| Slug redirect от стари URL | Частично | `product_slug_history`, UUID→slug — `lib/product-route.ts`; таблицата липсва в DB | 404 при смяна на slug | Apply #34 | M | Codex | Да | Не | **Да** |
| Order snapshot slug/code | Частично | `product_slug_and_code.sql` RPC добавя `productCode`/`productSlug`; production RPC е по-стара | Историческа проследимост | Apply #34 | M | Codex | Да | Не | **Да** |
| Draft/published/hidden/archived | Липсва | Само `is_sold_out`; blog/events имат `is_published` | Скриване без изтриване | Добави `status` enum | M | Codex + Cursor | Да | Препоръчително | Не |
| Soft delete/архив | Липсва | `admin_delete_product` — hard `DELETE` — `atomic_product_admin_functions.sql` | Възстановяване | Archive flag или soft delete | M | Codex + Cursor | Да | Препоръчително | Не |
| Shop търсене по код/slug | Частично | `/shop` търси само `title + description` — `app/shop/page.tsx:94` | Намиране при 200+ SKU | Разшири search | S | Cursor | Не | **Да** при 200+ | Не |
| Admin server pagination | Частично | `AdminListControls` — client-side hide — `components/admin/admin-list-controls.tsx` | DOM/памет | Server pagination + lazy editor | L | Cursor | Не | **Да** при 200+ | Не |
| Storefront pagination | Частично | `getStorefrontCatalog()` зарежда всички — `lib/storefront/repository.ts:117` | Payload и TTFB | Paginated shop | M | Cursor | Може | **Да** при 200+ | Не |
| AVIF | Частично | Upload → WebP (`process-image.ts`); Next Image може AVIF за remote | Оптимизация | По желание | XS | Cursor | Не | Не | Не |
| Orphaned storage cleanup | Частично | Best-effort при delete — `deleteProductScopedStoragePaths` | Storage разходи | Periodic sweep job | M | Cursor | Не | Не | След live |
| Email при неуспех | Частично | Поръчката се записва; грешка в `console.error` — `send-order-notifications.ts` | Загубени нотификации | Retry queue / alert | M | Cursor | Не | Не | Препоръчително |
| Error monitoring | Липсва | TODO в `docs/REFACTOR_PLAN.md` | Production debugging | Sentry или equivalent | M | Cursor | Не | Не | Препоръчително |
| Account noindex | Частично | `robots.ts` disallow `/account`; няма `metadata.robots` на страницата | SEO leakage | Добави metadata | XS | Cursor | Не | Не | След live |
| Blog/event/category JSON-LD | Липсва | Само Product — `app/products/[slug]/page.tsx` | Rich results | Добави structured data | S | Cursor | Не | Не | След live |
| Stripe | Не е започнато | Няма референции | Online payment | N/A ако COD only | — | — | — | — | — |
| Health/smoke HTTP endpoint | Частично | `npm run supabase:check` (CLI); няма `/api/health` | Uptime | Добави health route | S | Cursor | Не | Не | Препоръчително |
| product_slug_history RLS | Липсва | `product_slug_and_code.sql` — таблица без RLS | Security gap | Add RLS policies | S | Codex | Да | Не | **Да** (след #34) |
| Middleware admin gate | Частично | `middleware.ts` — session only; gate в page/actions | Defense in depth | Optional middleware redirect | S | Cursor | Не | Не | След live |
| Speedy delivery lookup | Частично | Manual fields only — `checkout-delivery-fields.tsx` | UX за Speedy | API integration (ако има) | M | Cursor | Не | Не | Не |

---

## D. Липсва преди въвеждане на много продукти (200–1000)

| # | Констатация | Защо е важно | Доказателство | Препоръчано действие | Размер | Изпълнител | SQL? | Преди продукти? | Преди live? |
|---|-------------|--------------|---------------|----------------------|--------|------------|------|-----------------|-------------|
| D1 | Server-side admin product pagination | PostgREST cap + DOM | `loadAdminData()` — `lib/admin/data.ts:64` | `loadAdminProductsPage()` с range/filters | L | Cursor | Не | **Да** | Не |
| D2 | Admin lazy rendering (не всички forms в DOM) | Browser freeze | `ProductListPanel` — `components/admin/product-list-panel.tsx` | Editor по product ID | L | Cursor | Не | **Да** | Не |
| D3 | Storefront catalog pagination | TTFB/payload | `getStorefrontCatalog()`, `app/shop/page.tsx` | Paginated catalog API | M | Cursor | Може | **Да** при 200+ | Не |
| D4 | Индекси за slug/code/name search | Query performance | `product_slug_and_code.sql` (не deployed) | Apply #34 + search indexes | S | Codex | Да | **Да** | Не |
| D5 | Product CSV import/export | Bulk onboarding | Няма product export; orders export ✅ — `app/admin/orders/export/route.ts` | Build import/export | L | Cursor | Може | **Да** | Не |
| D6 | Bulk actions (sold-out, category) | Admin efficiency | Няма bulk product actions | Bulk RPC + UI | M | Cursor | Може | Препоръчително | Не |
| D7 | Admin search по code/slug (server) | Намиране на SKU | Client-only `AdminListControls` | Server-side search | S | Cursor | Не | **Да** | Не |
| D8 | Product lifecycle status | Скриване без delete | Няма status колона | draft/published/hidden | M | Codex + Cursor | Да | Препоръчително | Не |
| D9 | Fix option values query scope | Global fetch + JS filter | `loadStorefrontProductDetails` — `repository.ts:405-411` | `.in("group_id", groupIds)` | S | Cursor | Не | **Да** | Не |
| D10 | PostgREST 1000-row cap на child tables | Silent data loss | Unbounded selects в `loadAdminData` | Pagination на всички child queries | Critical | Cursor | Не | **Да** | Не |

---

## E. Блокиращо преди live

| # | Констатация | Доказателство | Препоръчано действие | Размер | Изпълнител | SQL? |
|---|-------------|---------------|----------------------|--------|------------|------|
| E1 | Миграция #34 не е приложена | `npm run supabase:check`: `products.slug does not exist`, `product_slug_history` липсва | Apply `product_slug_and_code.sql` в Supabase SQL Editor | M | Codex | **Да** |
| E2 | Некомитнат slug/code код | `git status` — 37 modified/untracked файла | Commit + deploy след миграция | S | Cursor | Не |
| E3 | `NEXT_PUBLIC_SITE_URL` за production домейн | `docs/DEPLOYMENT.md`, `lib/site-url.ts` | Задай `https://vemidi-crafts.com` при DNS cutover | XS | Cursor | Не |
| E4 | Resend sender domain | `DEPLOYMENT.md` | Verify domain в Resend | S | Manual | Не |
| E5 | `supabase:check` трябва да минава | Partial fail при одита | Green check след #34 | XS | Cursor | Да |
| E6 | Production smoke test | `DEPLOYMENT.md` checklist | E2E: shop → cart → checkout → admin | S | Manual | Не |

---

## F. Препоръчително след live

| Тема | Защо | Препоръчано действие | Размер | Изпълнител | SQL? |
|------|------|----------------------|--------|------------|------|
| Sentry / error monitoring | Incident response | Интеграция | M | Cursor | Не |
| Email retry / admin alert | Пропуснати поръчки | Queue или webhook alert | M | Cursor | Не |
| Storage orphan sweep | Разходи | Cron/job | M | Cursor | Не |
| Blog/Article/Event JSON-LD | SEO rich results | Structured data components | S | Cursor | Не |
| `product_slug_history` RLS | Security hardening | Policies в SQL | S | Codex | Да |
| Middleware `/admin` gate | Defense in depth | Redirect unauthenticated | S | Cursor | Не |
| www ↔ non-www redirect | Canonical consistency | Vercel redirect rules | XS | Manual | Не |
| npm audit postcss (moderate) | Transitive CVE | Monitor Next updates | XS | — | Не |
| Product draft + soft archive | Content workflow | status + archive flag | L | Codex + Cursor | Да |
| Stripe (ако се добави плащане) | Online checkout | Full integration | XL | Cursor | Да |

---

## G. Рискове по severity

### Critical

| # | Риск | Доказателство | Действие |
|---|------|---------------|----------|
| G-C1 | Deploy на slug код без миграция #34 | `supabase:check` fail | Apply SQL първо |
| G-C2 | PostgREST 1000 cap — truncated child data | `loadAdminData` unbounded selects | Server pagination |
| G-C3 | Admin browser freeze — всички product forms в DOM | `ProductListPanel` | Lazy editor |

### High

| # | Риск | Доказателство | Действие |
|---|------|---------------|----------|
| G-H1 | Hard delete на продукти | `admin_delete_product` CASCADE | Archive workflow |
| G-H2 | Email failure без retry | `send-order-notifications.ts` | Retry/alert |
| G-H3 | `product_slug_history` без RLS | `product_slug_and_code.sql` | Add policies |
| G-H4 | Sitemap timeout при 1000+ products | `app/sitemap.ts` loads full catalog | Incremental sitemap |

### Medium

| # | Риск | Доказателство |
|---|------|---------------|
| G-M1 | Shop full catalog load + client filter | `app/shop/page.tsx` |
| G-M2 | Няма health HTTP endpoint | Няма `/api/health` |
| G-M3 | Account без explicit noindex metadata | `app/account/page.tsx` |
| G-M4 | Speedy без API lookup | `checkout-delivery-fields.tsx` |

### Low

| # | Риск | Доказателство |
|---|------|---------------|
| G-L1 | Lint warning `<img>` vs `next/image` | `event-gallery-image-tile.tsx` |
| G-L2 | PostCSS moderate CVE (transitive) | `npm audit` |
| G-L3 | Липса category/event JSON-LD | Само Product JSON-LD |

---

## H. Database и migration рискове

| Риск | Детайл |
|------|--------|
| Ред на миграции | 34 файла — `docs/SUPABASE_MIGRATIONS.md`; #34 = `product_slug_and_code.sql` |
| Текущо състояние | DB без `slug`/`product_code`; smoke check fail |
| Backfill | Миграцията генерира slug от name и code `VM-NNNNNN` за съществуващи продукти |
| RPC версии | v5 admin RPC + обновен `create_store_order` в #34; production има по-стари версии |
| Destructive ops | `admin_delete_product` CASCADE — няма archive |
| Backup | `DEPLOYMENT.md` изисква export преди destructive schema change |
| Re-run safety | Повечето миграции: `if not exists` / `create or replace` |
| Orders table | Споделена с landing — `admin_orders_access.sql` зависи от нея |

### Препоръчителен ред преди deploy

1. Export `products`, `product_images`, `orders` от Supabase
2. Apply `supabase/product_slug_and_code.sql` (миграция #34)
3. `npm run supabase:check` → всички checks green
4. Commit + deploy app code (slug/code промени)
5. Production smoke test по `docs/DEPLOYMENT.md`

---

## I. Рискове при 200 / 500 / 1000 продукта

| Метрика | ~200 продукта | ~500 продукта | ~1000 продукта |
|---------|---------------|---------------|----------------|
| `loadAdminData` products | ~200 rows OK | Бавно зареждане | **Hit 1000 cap** — липсват най-стари |
| `product_images` (avg 5/img) | ~1000 rows (на границата) | **Truncated ~1000** — грешни images | Severe data corruption в admin |
| Admin page HTML/DOM | Тежко (~10–30s) | Browser struggle | Likely tab crash |
| `/shop` SSR payload | ~500KB–1MB | 2–4MB | 4–8MB+ TTFB |
| Sitemap generation | OK | OK | Edge timeout риск |
| Checkout (per-order) | OK | OK | OK |
| Orders admin (paginated) | OK | OK | OK |

**Заключение:** При **200** админът е неудобен, но работи. При **500** child table truncation става вероятен. При **1000** — **небезопасно** без pagination refactor.

---

## J. Точен списък на файлове и функции (доказателства)

### 1. Продуктов модел

| Точка | Статус | Файл / функция / таблица |
|-------|--------|--------------------------|
| UUID | ✅ Реализирано | `supabase/products_table.sql` — `products.id`; `lib/catalog.ts` — `Product.id` |
| SEO slug | ⚠️ Частично | `supabase/product_slug_and_code.sql`; `lib/product-slug.ts` — `slugifyProductName`, `reserveUniqueProductSlug`; `lib/product-route.ts` — `resolveProductRoute` |
| Product code | ⚠️ Частично | `product_slug_and_code.sql` — `next_product_code()`; `lib/storefront/mappers.ts` — `productCode` |
| draft/published/hidden/archived | ❌ Липсва | Няма колона за `products`; blog/events: `is_published` в `event_gallery_images.sql` |
| sold-out | ✅ Реализирано | `product_sold_out.sql`; `is_sold_out` на products и option values; RPC проверка в `create_store_order` |
| soft delete/архив | ❌ Липсва | `atomic_product_admin_functions.sql` — `admin_delete_product` (hard DELETE) |
| timestamps | ✅ Реализирано | `products.created_at`, `products.updated_at` |
| order snapshot | ✅ (⚠️ slug/code след #34) | `create_store_order` — JSON items с name, prices, options, personalization |
| duplicate | ✅ Реализирано | `duplicate_product.sql` — `admin_duplicate_product`; `app/admin/actions.ts` |
| related products | ✅ Реализирано | `product_merchandising.sql` — `related_products`; `ProductMerchandisingFields` |
| featured | ✅ Реализирано | `home_featured_products`; `app/page.tsx` — `featuredProducts` |
| categories/occasions | ✅ Реализирано | `category_types.sql`; `product_categories` |
| variants/surcharges | ✅ Реализирано | `universal_product_options.sql`; `price_delta` на values |
| personalization | ✅ Реализирано | `product_personalization_and_wishes.sql`; `lib/checkout-personalization.ts` |
| promotions | ✅ Реализирано | `product_promotions.sql`; `lib/product-pricing.ts` |
| images + alt | ✅ Реализирано | `product_image_gallery.sql`; `alt_text`; `ProductDetailGallery` |

### 2. Мащабиране (200–1000)

| Точка | Статус | Доказателство |
|-------|--------|---------------|
| Server-side pagination (products) | ❌ | `loadAdminData` — `lib/admin/data.ts:83` — `select("*")` без limit |
| Server-side pagination (orders) | ✅ | `loadOrdersPage` — `lib/admin/orders.ts:735` — `.range()` |
| Search name/code/slug | ❌ shop; ⚠️ admin client | `app/shop/page.tsx:94`; `AdminListControls` |
| Filters category/occasion/status/stock/promo | ⚠️ Client-side | `app/shop/page.tsx`; admin `data-*` attributes |
| Sorting | ⚠️ Client-side | `app/shop/page.tsx`; `AdminListControls` |
| Bulk actions | ❌ | Няма за products |
| CSV export/import products | ❌ | Orders: `app/admin/orders/export/route.ts`; subscribers export ✅ |
| Queries load all products | ❌ | `getStorefrontCatalog`, `loadAdminData` |
| Database indexes | ⚠️ Child ✅; slug pending | `products_created_at_idx`; slug indexes в #34 |
| N+1 | ⚠️ Product page loads full catalog for related | `app/products/[slug]/page.tsx:94` |
| Large payloads | ❌ Risk | Full catalog in shop SSR |
| Admin renders all products | ❌ | `ProductListPanel` — всички `<details>` с editors |

### 3. Checkout и поръчки

**Поток:**

```
Product page → Cart (localStorage) → Checkout form → createStoreOrder (server action)
  → check_store_checkout_rate_limit
  → validate options/personalization (server)
  → create_store_order RPC (service role)
  → orders row + raw_payload snapshot
  → sendOrderNotifications (Resend)
  → admin orders panel
```

| Аспект | Client | Server | Database |
|--------|--------|--------|----------|
| Цена | Показва, не валидира окончателно | Pre-validates options | **Authoritative** — reload от `products` |
| Защита от подадена цена | Cart има price field | RPC игнорира client price | `create_store_order` изчислява unit_price |
| Double submit | Disabled button + idempotency UUID | `createStoreOrder` | `store_order_requests` ON CONFLICT |
| Idempotency | `crypto.randomUUID()` | Passes to RPC | Unique key constraint |
| Rate limiting | — | `check_store_checkout_rate_limit` | 8 attempts / 15 min / fingerprint |
| Option validation | UI only | `validateProductOptionSelections` + RPC | Sold-out, dependencies, counts |
| Snapshot name/code/slug/variants/prices | — | RPC builds JSON | `raw_payload` items |
| Promotions | Display | RPC applies active promotion | `product_promotions` |
| Deleted/archived products | Stale cart possible | `product_not_found` error | Existence check |
| Customer + admin email | — | `sendOrderNotifications` | Order saved regardless |
| Failed email handling | — | `console.error` only | No retry |
| Error messages | `checkoutErrorMessages` map | `app/checkout/actions.ts` | SQL exception codes |
| Form persistence on error | ✅ Controlled state | `customerName`, `customerPhone`, etc. | — |
| Econt | City/office picker | `/api/shipping/econt/*` | Stored in order fields |
| Speedy | Manual fields | — | Stored in order fields |
| Campaign attribution | Query params → cart | `normalizeCampaignCode`, `normalizeLandingUrl` | `p_attribution` in RPC |

**Ключови файлове:**

- `components/checkout/checkout-panel.tsx` — `CheckoutPanel`, `PURCHASE_STORAGE_KEY`
- `app/checkout/actions.ts` — `createStoreOrder`
- `supabase/universal_product_options.sql` / `product_slug_and_code.sql` — `create_store_order`
- `lib/orders/send-order-notifications.ts` — `sendOrderNotifications`
- `lib/orders/order-email.ts` — email templates
- `lib/campaign-handoff.ts`, `lib/campaign-attribution.ts`
- `components/checkout/checkout-delivery-fields.tsx`

### 4. Сигурност

| Точка | Статус | Доказателство |
|-------|--------|---------------|
| Supabase RLS | ✅ (⚠️ slug_history) | `admin_auth.sql`, `security_hardening_phase1/2.sql`, table-specific SQL |
| Admin authorization | ✅ per action | `checkIsAdmin` — всички `app/admin/*-actions.ts`, export routes |
| Service role usage | ✅ server-only | `lib/supabase/service.ts` — checkout RPC |
| Public operations | ✅ controlled | Storefront read via anon; write via RPC + service role |
| Upload validation | ✅ | `process-image.ts` — MIME, size, pixels, format |
| MIME spoofing | ✅ mitigated | Sharp metadata validation |
| Path traversal | ✅ mitigated | Storage paths scoped to product ID — `product-image-storage.ts` |
| XSS | ✅ low risk | Plain text rendering; JSON-LD `replace(/</g, "\\u003c")` |
| CSV formula injection | ✅ | `escapeCsvCell` — `lib/admin/orders.ts:605` |
| Open redirects | ✅ | `normalizeLandingUrl` — allowlist hosts — `campaign-attribution.ts:108` |
| URL query validation | ✅ | `normalizeCampaignCode`, `normalizeCampaignSource` |
| Rate limiting | ✅ checkout/events/subs | RPC + server actions |
| PII in logs | ⚠️ low | Checkout RPC logs code/message only; Resend error body may leak provider info |
| Secrets in Git | ✅ | `.gitignore` — `.env*.local`; не са отпечатани в този отчет |
| Dependencies | ⚠️ 2 moderate | `npm audit` — postcss transitive via next; 0 high/critical |

### 5. Изображения и storage

| Точка | Статус | Доказателство |
|-------|--------|---------------|
| Profiles (product/category/event/blog/hero) | ✅ | `lib/images/profiles.ts` — `IMAGE_PROFILES` |
| WebP output | ✅ | `process-image.ts:127` — `.webp()` |
| AVIF | ⚠️ via Next optimizer only | Upload is WebP; `next/image` remote optimization |
| Resize + quality | ✅ | `maxDimension`, `quality` per profile |
| Size/count limits | ✅ | 15MB max, 12 product images |
| Lazy loading | ✅ | Thumbs lazy; main `priority` — `product-detail-gallery.tsx` |
| Responsive sizes | ✅ | `sizes="(max-width: 1024px) 100vw, 52vw"` |
| Primary image | ✅ | `is_primary` — `product_images` |
| Alt text | ✅ | `alt_text` column + admin forms |
| Orphaned files | ⚠️ | Best-effort delete; no periodic sweep |
| Upload rollback | ✅ | `deleteProductAtomic` on failed gallery attach — `app/admin/actions.ts:509-523` |
| Delete on product remove | ✅ | `deleteProductScopedStoragePaths` |
| Vercel/Sharp | ✅ | `optionalDependencies` linux sharp; `next.config.ts` tracing |
| Storage/bandwidth risk at scale | ⚠️ | ~1GB+ при 1000 products × 5 images |

### 6. SEO

| Точка | Статус | Доказателство |
|-------|--------|---------------|
| SEO slug | ⚠️ код, не DB | `product_slug_and_code.sql` |
| Canonical | ✅ | Product/blog metadata `alternates.canonical` |
| Sitemap | ✅ | `app/sitemap.ts` — products, blog, events, static |
| robots.txt | ✅ | `app/robots.ts` — disallow admin/account/checkout |
| Metadata | ✅ | Per-page `generateMetadata` |
| Open Graph | ✅ | Product, blog pages |
| Twitter cards | ✅ | Product page |
| Product JSON-LD | ✅ | `app/products/[slug]/page.tsx:120-150` |
| Category/event/blog JSON-LD | ❌ | Няма |
| UUID addresses | ⚠️ redirect след #34 | `lib/product-route.ts` — UUID → slug permanent redirect |
| Old slug redirect | ⚠️ след #34 | `product_slug_history` lookup |
| Duplicate content | ✅ mitigated | Canonical URLs |
| noindex admin/cart/checkout | ✅ | `robots.ts` + page metadata |
| noindex account | ⚠️ robots.txt only | `app/account/page.tsx` — no metadata |
| 404 | ✅ | `notFound()` на product/blog |
| www/non-www | ⚠️ not configured | Vercel redirect TBD |
| SITE_URL | ✅ | `lib/site-url.ts` — `NEXT_PUBLIC_SITE_URL` |

### 7. Production инфраструктура

| Точка | Статус | Доказателство |
|-------|--------|---------------|
| Vercel production/preview | ✅ documented | `docs/DEPLOYMENT.md` |
| Supabase prod/staging | ⚠️ single env in check | `scripts/supabase-smoke-check.mjs` |
| Migration order | ✅ | `docs/SUPABASE_MIGRATIONS.md` — 34 steps |
| Backup documentation | ✅ | `DEPLOYMENT.md` — export before destructive |
| Env validation | ✅ | `scripts/check-env.mjs` |
| Sharp runtime | ✅ | `package.json` optionalDeps; `next.config.ts` |
| Email (Resend) | ✅ | `send-order-notifications.ts`; env vars in DEPLOYMENT.md |
| Econt | ✅ | `ECONT_API_USERNAME/PASSWORD`; fallback manual |
| Speedy | ⚠️ manual only | `checkout-delivery-fields.tsx` |
| Stripe | ❌ not started | No references |
| Error monitoring | ❌ | `docs/REFACTOR_PLAN.md` TODO |
| Health/smoke checks | ⚠️ CLI only | `npm run supabase:check`; no HTTP health |
| Deployment checklist | ✅ | `DEPLOYMENT.md` — pre-push + smoke test |

### 8. UX и accessibility

| Точка | Статус | Доказателство |
|-------|--------|---------------|
| Mobile navigation | ✅ | `MobileNav`, responsive header — `header.tsx` |
| Product selection | ✅ | `ProductDetailAddToCart`, option validation UI |
| Cart | ✅ | `cart-provider.tsx`, `/cart` page |
| Checkout | ✅ | Labels, `aria-invalid`, disabled submit |
| Form errors | ✅ | `fieldErrors`, `checkoutErrorMessages` |
| Loading/disabled states | ✅ | `useFormStatus`, pending button text |
| Success feedback | ✅ | Redirect to `/thank-you` |
| Keyboard navigation | ✅ | Focus styles, skip link — `site-shell.tsx` |
| Labels | ✅ | Checkout form labels |
| Focus | ✅ | `focus-visible` on nav links |
| Modal/dialog | N/A mostly | Admin uses `<details>` |
| Unsaved product changes | ✅ | `AdminUnsavedChangesGuard` |
| Admin usability at scale | ❌ | All products in DOM |

### 9. Автоматизирани проверки

Виж секция **K**.

---

## K. Резултати от test / lint / typecheck / build

| Команда | Резултат |
|---------|----------|
| `npm test` | **177/177 passed** |
| `npm run lint` | **0 errors**, 1 warning (`event-gallery-image-tile.tsx` — `<img>` vs `next/image`) |
| `npm run typecheck` | **Passed** |
| `npm run build` | **Passed** |
| `npm run env:check` | **Passed** — всички required env vars налични локално |
| `npm run supabase:check` | **FAILED** — `products.slug` липсва; `product_slug_history` липсва; останалите table/RPC checks OK |
| `npm audit --audit-level=high` | **0 high/critical**; 2 moderate (postcss transitive via next) |

### Lint warning

```
event-gallery-image-tile.tsx — prefer next/image over <img>
```

### supabase:check failures (критично)

```
Table check failed: products - column products.slug does not exist
Table check failed: product_slug_history - Could not find the table 'public.product_slug_history'
```

Всички останали проверени таблици и RPC-та минаха успешно.

---

## L. Предложен ред на следващите пакети за работа

### Пакет 1 — Блокер sync (преди всичко)

**Цел:** Синхронизиране на код и база за slug/product code.

1. Backup `products`, `product_images`, `orders` в Supabase
2. Apply `supabase/product_slug_and_code.sql` (миграция #34)
3. `npm run supabase:check` → green
4. Commit + deploy slug/code код
5. Production smoke test по `docs/DEPLOYMENT.md`

| | |
|---|---|
| Размер | S (операционен) |
| Изпълнител | Codex (SQL) + Cursor (verify/deploy) |
| SQL миграция | **Да** |
| Преди продукти | Не (но преди deploy на slug код) |
| Преди live | **Да** |

---

### Пакет 2 — Admin scaling (преди 50+ продукта, задължително при 200+)

**Цел:** Админ панелът да работи със стотици продукти.

1. `loadAdminProductsPage()` с server pagination, filters, search
2. Lazy product editor — отваря се по ID, не всички forms в DOM
3. Server search по name, product code, slug

| | |
|---|---|
| Размер | L |
| Изпълнител | Cursor |
| SQL миграция | Не |
| Преди продукти | **Да** при 200+ |
| Преди live | Не (но преди bulk import) |

---

### Пакет 3 — Storefront scaling

**Цел:** `/shop` и sitemap да не зареждат целия каталог.

1. Paginated `/shop` или cursor-based catalog
2. Fix `loadStorefrontProductDetails` — filter option values в SQL query
3. Sitemap — incremental или chunked generation

| | |
|---|---|
| Размер | M |
| Изпълнител | Cursor |
| SQL миграция | Може (indexes) |
| Преди продукти | **Да** при 200+ |
| Преди live | Не |

---

### Пакет 4 — Product lifecycle

**Цел:** Draft/hidden/archive без hard delete.

1. `status` enum: draft, published, hidden, archived
2. Storefront показва само published
3. Admin filters по status

| | |
|---|---|
| Размер | M |
| Изпълнител | Codex (SQL) + Cursor (UI) |
| SQL миграция | **Да** |
| Преди продукти | Препоръчително |
| Преди live | Не |

---

### Пакет 5 — Operations & monitoring

**Цел:** Production observability и надеждни нотификации.

1. Sentry или equivalent error monitoring
2. Email retry / failed notification alert
3. `/api/health` endpoint
4. `product_slug_history` RLS policies

| | |
|---|---|
| Размер | M |
| Изпълнител | Cursor + Codex (RLS) |
| SQL миграция | Само за RLS |
| Преди продукти | Не |
| Преди live | Препоръчително |

---

### Пакет 6 — Bulk catalog tools

**Цел:** Масово въвеждане на продукти.

1. CSV export/import за products (с images metadata)
2. Bulk sold-out, category assign, archive

| | |
|---|---|
| Размер | L |
| Изпълнител | Cursor |
| SQL миграция | Може |
| Преди продукти | **Да** при mass import |
| Преди live | Не |

---

### Пакет 7 — SEO polish (след live)

**Цел:** Rich results и canonical hygiene.

1. Blog/Article/Event JSON-LD
2. Account explicit `noindex` metadata
3. www/non-www redirect в Vercel

| | |
|---|---|
| Размер | S |
| Изпълнител | Cursor |
| SQL миграция | Не |
| Преди продукти | Не |
| Преди live | Не |

---

## Потвърждение (одит)

- **Няма променени файлове** от одита (working tree може да съдържа предишни некомитнати SEO промени).
- **Няма изпълнен SQL** (само read-only `supabase:check` през API).
- **Няма commit или push.**

---

*Генериран: 12 юни 2026 — READ-ONLY pre-production audit*
