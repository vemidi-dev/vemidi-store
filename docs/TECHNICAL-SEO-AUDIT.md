# Technical SEO Audit — VeMiDi crafts (Next.js Storefront)

**Project:** `D:\Cursor\src`
**Audit date:** 2026-06-14
**Phase 1 implementation:** 2026-06-14 (commit `0b28884`, pushed)
**Phase 2 implementation:** 2026-06-14 (commit `f34dacd`, pushed)
**Phase 3 implementation:** 2026-06-14 (content & URL strategy — code only, no commit/deploy)
**Branch:** `main`
**Scope:** Read-only audit + Phase 1–3 SEO fixes (local validation only)

---

## Phase 1 implementation status (launch blockers)

| ID | Issue | Status | Notes |
|---|---|---|---|
| CRITICAL-01 | Product JSON-LD availability | ✅ Done | `unavailable` → `OutOfStock` (not Discontinued); helper + tests |
| CRITICAL-02 | `/shop?product=` vs `/categories/` duplication | ✅ Done | 308 redirect when only valid product category; internal links updated |
| HIGH-01 | 404 / invalid URL indexation | ✅ Partial | Invalid **product**: `noindex,nofollow` via `generateMetadata`. Invalid **category**: `noindex,follow` in `generateMetadata` (fixes layout `index,follow` leak). Next.js 404 also injects `noindex`. `not-found.tsx` unchanged — framework handles it. |
| HIGH-02 | `/products` temporary redirect | ✅ Done | `permanentRedirect` via `resolveProductsPageRedirect()` |
| HIGH-03 | Faceted `/shop` and `/blog` crawl traps | ✅ Done | Any query key present → `noindex,follow` (incl. empty values); bare routes indexable |
| HIGH-04 | Empty category soft 404 | ✅ Done | `noindex, follow` + sitemap exclusion; parent with child products stays indexable |
| HIGH-05 | BreadcrumbList JSON-LD | ✅ Done | Reusable helper; category/product/blog/event pages |
| MEDIUM-09 | `category_hierarchy.sql` applied | ✅ Confirmed | Applied in Supabase (user confirmed) |

### Phase 2 implementation status (rich results + indexability)

| ID | Issue | Status | Notes |
|---|---|---|---|
| HIGH-04 | Empty category soft 404 | ✅ Done | `lib/seo/category-indexability.ts`; page stays 200, `noindex, follow`, excluded from sitemap |
| HIGH-05 | BreadcrumbList JSON-LD | ✅ Done | `lib/seo/breadcrumbs.ts` + `components/seo/json-ld.tsx`; absolute URLs, no duplicates |
| MEDIUM-01 | Organization / WebSite JSON-LD | ✅ Done | Root layout; data from `config/site.ts`; no SearchAction |
| MEDIUM-02 | Article / Event JSON-LD | ✅ Done | `/blog/[slug]`, `/events/[slug]`; optional fields omitted when empty |
| MEDIUM-04 | Category Twitter metadata | ✅ Done | Mirrors OG; invalid category remains `noindex` |
| MEDIUM-07 | `robots.txt` disallow gaps | ✅ Done | `/cart`, `/login`, `/campaign-checkout`, `/auth/` added |
| LOW-01 | Login page `noindex` | ✅ Done | Explicit `noindex, nofollow`; account page same |
| Sitemap | Empty categories excluded | ✅ Done | `filterIndexableProductCategories` in `app/sitemap.ts` |

### Phase 2 validation (post-implementation)

| Check | Result |
|---|---|
| `npm run typecheck` | ✅ Pass |
| `npm run lint` | ✅ Pass (2 pre-existing warnings) |
| `npm test` | ✅ Pass (304 tests, 0 failures) |
| `npm run build` | ✅ Pass |
| `git diff --check` | ✅ Pass |

### Phase 3 implementation status (content & URL strategy)

| ID | Issue | Status | Notes |
|---|---|---|---|
| MEDIUM-03 | Occasion landing URL strategy | ✅ Done | `/occasions/[slug]` indexable landings; 308 from sole `?occasion=` / legacy `?category=`; sitemap + internal links updated |
| MEDIUM-05 | Product Open Graph metadata | ✅ Partial | Enhanced OG/Twitter with real title, description, image, canonical; `type: website` (Next.js Metadata API has no `product` type) |
| MEDIUM-06 | Homepage explicit metadata | ✅ Done | `buildHomePageMetadata()` with absolute title; avoids layout template duplication |
| MEDIUM-08 | Sitemap real `lastModified` | ✅ Done | Products use `updated_at ?? created_at`; product categories use max timestamp from direct + child assignments; occasions keep direct assignment only; static routes omit `lastModified` |
| HIGH-01 | `not-found.tsx` metadata | ✅ Done | `noindex, nofollow` via `notFoundPageMetadata` export |

### Phase 3 validation (post-implementation)

| Check | Result |
|---|---|
| `npm run typecheck` | ✅ Pass |
| `npm run lint` | ✅ Pass (2 pre-existing warnings) |
| `npm test` | ✅ Pass (333 tests, 0 failures) |
| `npm run build` | ✅ Pass |
| `git diff --check` | ✅ Pass |

| Check | Result |
|---|---|
| `npm run typecheck` | ✅ Pass |
| `npm run lint` | ✅ Pass (1 pre-existing warning) |
| `npm test` | ✅ Pass (284 tests, 0 failures) |
| `npm run build` | ✅ Pass |
| `git diff --check` | ✅ Pass |

### 404 HTML verification (production build, `next start -p 3001`)

| URL | HTTP | Robots in HTML | Notes |
|---|---|---|---|
| `/products/invalid-product-slug-xyz` | 404 (RSC stream may report 200 initially) | `noindex, nofollow` | From product `generateMetadata` |
| `/categories/invalid-category-slug-xyz` | 404 | `noindex` (+ fixed: no longer leaks `index, follow` from layout) | Next.js 404 + category `generateMetadata` |
| `/shop?product={valid-slug}` | 308 → `/categories/{slug}` | n/a | When slug exists in catalog (unit-tested; local DB may differ) |
| `/shop?q=test` | 200 | `noindex, follow` + canonical `/shop` | Faceted metadata |

---

## Executive summary

The storefront has a **solid SEO foundation**: App Router server components for catalog/category/product pages, dynamic `sitemap.xml`, `robots.txt`, per-route metadata/canonicals on most public templates, UUID and historical slug redirects for products, and explicit `noindex` on checkout funnel pages.

The **biggest gaps** are:

1. **Structured data accuracy** — Product JSON-LD always reports `PreOrder` availability regardless of stock state.
2. **Faceted URL indexation** — `/shop` filter combinations and legacy `/shop?product=` URLs duplicate new `/categories/[slug]` pages without a strict canonical/noindex policy.
3. **404/indexation hygiene** — Global layout defaults to `index: true`; `not-found.tsx` and several utility routes lack explicit `noindex`.
4. ~~**Missing rich-result schemas**~~ — Phase 2 adds `BreadcrumbList`, `Organization`/`WebSite`, `Article`, and `Event` JSON-LD.
5. **Migration verification** — `category_hierarchy.sql` confirmed applied in Supabase (2026-06-14).

**Phase 1 complete.** **Phase 2 complete** (commit `f34dacd`). **Phase 3 complete locally** — occasion landings, homepage/product metadata, sitemap timestamps, not-found metadata. Remaining: CWV tuning — see Phase 4 below.

---

## Pre-audit state

| Check | Result |
|---|---|
| `git status` | Clean except untracked `tmp-*.log` |
| `git branch` | `main` |
| `git diff --stat` | No changes |
| `git diff --check` | No changes |
| `npm run typecheck` | ✅ Pass |
| `npm run lint` | ✅ Pass (1 pre-existing warning in `event-gallery-image-tile.tsx`) |
| `npm test` | ✅ Pass (0 failures) |
| `npm run build` | ✅ Pass |

### `category_hierarchy.sql` migration status

| Source | Finding |
|---|---|
| `docs/SUPABASE_MIGRATIONS.md` L330–352 | Documents migration as **required before deploy** of `/categories/[slug]` |
| `docs/DEPLOYMENT.md` L79–89 | Same apply order + smoke-test checklist |
| `supabase/category_hierarchy.sql` | Present in repo; committed |
| Applied-migration registry | **None in codebase** — no `schema_migrations` table reference, no “applied on DATE” marker |

**Conclusion:** Migration **confirmed applied** in Supabase (2026-06-14). Subcategory URLs and sitemap category entries are safe to treat as live.

---

## Issues (ordered by priority, then SEO impact)

---

### CRITICAL-01 — Product schema availability is always `PreOrder`

| Field | Value |
|---|---|
| **Affected templates** | `/products/[slug]` |
| **Evidence** | `app/products/[slug]/page.tsx` L132–148 — `offers.availability` hardcoded to `https://schema.org/PreOrder` |
| **SEO risk** | Rich-result mismatch with visible “В наличност” / “Изчерпан” UI; Google may suppress Product snippets or flag structured-data errors |
| **Priority** | Critical |
| **Complexity** | Small |
| **Solution** | Map `resolveProductAvailability()` to `InStock`, `OutOfStock`, `PreOrder` (`unavailable` → `OutOfStock`) |
| **Tests** | Unit test mapping fulfillment → schema availability; Rich Results Test on stocked/sold-out/made-to-order products |

---

### CRITICAL-02 — Filtered `/shop` URLs duplicate `/categories/[slug]` without indexation guard

| Field | Value |
|---|---|
| **Affected URL types** | `/shop?product={slug}`, `/shop?category={slug}`, `/shop?product={parent}` (includes children via `getCategoryFamilySlugs`) vs `/categories/{slug}` |
| **Evidence** | `app/shop/page.tsx` L16–20 canonical always `/shop`; L112–115 category filter logic; `app/categories/[slug]/page.tsx` L44 canonical `/categories/{slug}`; internal links still use shop filters: `components/category/category-showcase-card.tsx` L19–23 (occasions only → shop), `app/blog/[slug]/page.tsx` L86, `app/blog/page.tsx` L134 |
| **SEO risk** | Duplicate indexable URLs for the same product sets; diluted ranking signals; crawl budget waste |
| **Priority** | Critical |
| **Complexity** | Medium |
| **Solution** | Strategy: (a) when **only** `product={slug}` is active and matches a product category → `301` or canonical to `/categories/{slug}`; (b) any other filter/search/sort combo → `robots: noindex, follow` + canonical `/shop`; (c) update internal links (blog CTAs, legacy components) to `/categories/{slug}` for product categories |
| **Tests** | Metadata tests for shop searchParams matrix; curl/Google URL Inspection on `/shop?product=x` vs `/categories/x` |

---

### HIGH-01 — `not-found` and missing-record pages inherit `index: true`

| Field | Value |
|---|---|
| **Affected templates** | `app/not-found.tsx`, invalid `/categories/[slug]`, invalid `/products/[slug]` (metadata returns empty/`noindex` only on product redirect/not-found metadata paths) |
| **Evidence** | `app/layout.tsx` L55–58 `robots: { index: true }`; `app/not-found.tsx` — no metadata export; `app/categories/[slug]/page.tsx` L30–31 returns `{}` before `notFound()` |
| **SEO risk** | Soft-404 URLs may enter index with generic titles; thin/duplicate error content |
| **Priority** | High |
| **Complexity** | Small |
| **Solution** | Export metadata on `not-found.tsx`: `robots: { index: false, follow: true }`; in category `generateMetadata` not-found branch return explicit `noindex` |
| **Tests** | Request invalid slugs; verify `<meta name="robots" content="noindex">` and HTTP 404 |

---

### HIGH-02 — `/products` listing alias uses temporary redirect

| Field | Value |
|---|---|
| **Affected URL types** | `/products`, `/products?category=`, `/products?product=` |
| **Evidence** | `app/products/page.tsx` L23 — `redirect()` (Next.js default **307**) to `/shop` |
| **SEO risk** | Legacy inbound links to `/products` do not consolidate permanently; split signals with `/shop` |
| **Priority** | High |
| **Complexity** | Small |
| **Solution** | Use `permanentRedirect()` (308) when query maps cleanly; consider redirecting product-category queries to `/categories/{slug}` instead of `/shop?product=` |
| **Tests** | Assert 308 status; verify query preservation for occasion filters |

---

### HIGH-03 — Faceted navigation crawl trap on `/shop` and `/blog`

| Field | Value |
|---|---|
| **Affected URL types** | `/shop?q=&product=&occasion=&price=&sort=&personalization=&promotions=`; `/blog?q=&category=&sort=` |
| **Evidence** | `app/shop/page.tsx` — no `generateMetadata` for params; static canonical `/shop`; `app/blog/page.tsx` L111–152 filters without robots/canonical override |
| **SEO risk** | Combinatorial URL space (`product` × `occasion` × `price` × `sort` × `q` × flags); near-duplicate SERP entries |
| **Priority** | High |
| **Complexity** | Medium |
| **Solution** | Indexable: bare `/shop`, bare `/blog`. Noindex: any query present on `/shop` except planned 301 to category pages. Canonical `/blog` for filtered blog views. Optional: strip unknown params |
| **Tests** | Metadata matrix test; Screaming Frog crawl of `/shop` with 2–3 param depth |

---

### HIGH-04 — Empty category pages return HTTP 200

| Field | Value |
|---|---|
| **Affected templates** | `/categories/[slug]` with zero products (including new subcategories) |
| **Evidence** | `app/categories/[slug]/page.tsx` L161–170 — 200 with empty-state copy |
| **SEO risk** | Soft 404 / thin content indexed for admin-created empty categories |
| **Priority** | High |
| **Complexity** | Small |
| **Solution** | If `categoryProducts.length === 0` and no child subcategories with products → `notFound()` or `noindex` + prominent internal links; optionally hide from sitemap until products exist |
| **Tests** | Category page test for empty slug; sitemap exclusion rule |

---

### HIGH-05 — Missing `BreadcrumbList` JSON-LD on commerce templates

| Field | Value |
|---|---|
| **Affected templates** | `/categories/[slug]`, `/products/[slug]`, optionally `/shop` |
| **Evidence** | Visual breadcrumbs in hero only as links (`app/categories/[slug]/page.tsx` L89–113); grep shows no `BreadcrumbList` in codebase |
| **SEO risk** | Lost breadcrumb rich results; weaker hierarchy signals for new subcategory URLs |
| **Priority** | High |
| **Complexity** | Medium |
| **Solution** | Add JSON-LD matching visible trail: Home → Categories → {Parent?} → {Category} → Product |
| **Tests** | Rich Results Test; snapshot test for breadcrumb JSON |

---

### MEDIUM-01 — No site-level `Organization` / `WebSite` structured data

| Field | Value |
|---|---|
| **Affected templates** | Global (`app/layout.tsx`) |
| **Evidence** | No `@type: Organization` or `WebSite` JSON-LD; business data exists in `config/site.ts` |
| **SEO risk** | Weaker brand/knowledge panel signals; no `SearchAction` sitelinks searchbox potential |
| **Priority** | Medium |
| **Complexity** | Small |
| **Solution** | Inject Organization JSON-LD in root layout with name, url, logo, email, phone, address, sameAs social URLs |
| **Tests** | Schema validator; Rich Results Test on homepage |

---

### MEDIUM-02 — Blog and event detail pages lack Article/Event JSON-LD

| Field | Value |
|---|---|
| **Affected templates** | `/blog/[slug]`, `/events/[slug]` |
| **Evidence** | `app/blog/[slug]/page.tsx`, `app/events/[slug]/page.tsx` — OG tags only, no `application/ld+json` |
| **SEO risk** | Missed article/event rich results (title, date, image, location) |
| **Priority** | Medium |
| **Complexity** | Medium |
| **Solution** | Add `Article` (headline, datePublished, author, image) and `Event` (startDate, location, offers) JSON-LD |
| **Tests** | Rich Results Test per template |

---

### MEDIUM-03 — Occasion categories have no dedicated indexable landing URLs in sitemap

| Field | Value |
|---|---|
| **Affected URL types** | `/shop?occasion={slug}` (used from `/occasions`, homepage, `/categories`) |
| **Evidence** | `app/sitemap.ts` L45–52 includes **product** categories only; occasions hub at `/occasions` L22; `app/occasions/page.tsx` L39 links to shop filters |
| **SEO risk** | Occasion intent pages rely on parameterized shop URLs (blocked by faceted strategy); occasion terms underrepresented in sitemap |
| **Priority** | Medium |
| **Complexity** | Large |
| **Solution** | Either: (a) add `/occasions/[slug]` routes + sitemap entries, or (b) explicitly noindex occasion filter URLs and strengthen `/occasions` hub content |
| **Tests** | Sitemap diff; indexation check for top occasion slugs |

---

### MEDIUM-04 — Category metadata incomplete (Twitter, missing not-found robots)

| Field | Value |
|---|---|
| **Affected templates** | `/categories/[slug]` |
| **Evidence** | `app/categories/[slug]/page.tsx` L41–53 — Open Graph present, no `twitter` block; L30–31 empty metadata on missing category |
| **SEO risk** | Suboptimal social previews; invalid slug metadata gap |
| **Priority** | Medium |
| **Complexity** | Small |
| **Solution** | Add Twitter card mirroring OG; return `{ robots: { index: false } }` when category missing |
| **Tests** | Metadata unit tests |

---

### MEDIUM-05 — Product Open Graph type is `website` not `product`

| Field | Value |
|---|---|
| **Affected templates** | `/products/[slug]` |
| **Evidence** | `app/products/[slug]/page.tsx` L54–55 `openGraph.type: "website"` |
| **SEO risk** | Minor — some crawlers/social platforms prefer `product` OG type |
| **Priority** | Medium |
| **Complexity** | Small |
| **Solution** | Set `openGraph.type` to `"website"` → check Next.js Metadata support; use `product` if supported or add product-specific OG tags |
| **Tests** | Facebook Sharing Debugger |

---

### MEDIUM-06 — Homepage lacks page-level metadata export

| Field | Value |
|---|---|
| **Affected templates** | `/` (`app/page.tsx`) |
| **Evidence** | No `export const metadata`; inherits root layout defaults |
| **SEO risk** | Low today because root defaults are reasonable; future layout changes could unintentionally affect homepage |
| **Priority** | Medium |
| **Complexity** | Small |
| **Solution** | Add explicit homepage metadata (title, description, canonical `/`, OG image) |
| **Tests** | Snapshot metadata test |

---

### MEDIUM-07 — `robots.txt` disallow list incomplete

| Field | Value |
|---|---|
| **Affected URL types** | `/cart`, `/login`, `/campaign-checkout`, `/auth/*` |
| **Evidence** | `app/robots.ts` L12 — disallows `/admin/`, `/account`, `/checkout`, `/thank-you` only; cart/checkout pages set page-level noindex |
| **SEO risk** | Crawl budget spent on utility URLs; inconsistent policy vs page metadata |
| **Priority** | Medium |
| **Complexity** | Small |
| **Solution** | Extend disallow: `/cart`, `/login`, `/campaign-checkout`, `/auth/` (keep page-level noindex as defense in depth) |
| **Tests** | Fetch `/robots.txt` on preview/production |

---

### MEDIUM-08 — Sitemap `lastModified` uses generation time for all catalog URLs

| Field | Value |
|---|---|
| **Affected templates** | `app/sitemap.ts` |
| **Evidence** | L14 `const now = new Date()` used for products/categories/static routes; blog/events use real `updated_at` |
| **SEO risk** | Crawlers cannot prioritize truly updated product/category pages |
| **Priority** | Medium |
| **Complexity** | Medium |
| **Solution** | Use product/category `updated_at` from Supabase when available |
| **Tests** | Sitemap XML inspection after product edit |

---

### MEDIUM-09 — Subcategory sitemap entries without parent validation gate

| Field | Value |
|---|---|
| **Affected templates** | `/categories/[slug]` (child categories) |
| **Evidence** | `app/sitemap.ts` L45–52 emits all product categories including children; depends on `parent_id` column from migration |
| **SEO risk** | If migration not applied, sitemap/category pages may error or show flat catalog |
| **Priority** | Medium |
| **Complexity** | Small (ops) |
| **Solution** | Confirm migration applied in production; add deploy check that queries `parent_id` existence |
| **Tests** | `npm run supabase:check`; manual SQL verification |

---

### LOW-01 — Login page lacks explicit `noindex`

| Field | Value |
|---|---|
| **Affected templates** | `/login` |
| **Evidence** | `app/login/page.tsx` — no metadata export |
| **SEO risk** | Thin utility page indexation |
| **Priority** | Low |
| **Complexity** | Small |
| **Solution** | Add `robots: { index: false, follow: false }` |
| **Tests** | View source on `/login` |

---

### LOW-02 — Product listing uses client component for card media carousel

| Field | Value |
|---|---|
| **Affected templates** | Shop/category/home product grids |
| **Evidence** | `components/product/product-card-media.tsx` L1 `"use client"`; primary image/link still SSR via Next/Image |
| **SEO risk** | Low for indexing (links/titles server-rendered in `product-card.tsx`); minor JS/hydration cost affects INP |
| **Priority** | Low |
| **Complexity** | Medium |
| **Solution** | Split static first-image server component from optional client carousel enhancement |
| **Tests** | View-source check for product links; Lighthouse INP |

---

### LOW-03 — Multiple `priority` images on listing/hero pages

| Field | Value |
|---|---|
| **Affected templates** | Category/shop heroes, home hero, header logo |
| **Evidence** | `components/layout/visual-page-hero.tsx` L31 `priority`; `components/home/home-hero.tsx` L75; header logo L31 |
| **SEO risk** | LCP contention when several images compete for priority |
| **Priority** | Low |
| **Complexity** | Small |
| **Solution** | Reserve `priority` for single LCP candidate per page (hero OR logo, not all) |
| **Tests** | Lighthouse LCP element audit per template |

---

### LOW-04 — No `generateStaticParams` for product/category/blog/event slugs

| Field | Value |
|---|---|
| **Affected templates** | All dynamic `[slug]` routes |
| **Evidence** | Grep: no `generateStaticParams` in repo |
| **SEO risk** | None directly — SSR works; slightly slower first crawl response vs SSG/ISR |
| **Priority** | Low |
| **Complexity** | Medium |
| **Solution** | Optional ISR with `generateStaticParams` for top categories/products |
| **Tests** | TTFB comparison before/after |

---

### LOW-05 — Internal links encode inconsistently

| Field | Value |
|---|---|
| **Affected templates** | Product cards vs category cards |
| **Evidence** | `components/product/product-card.tsx` L54 `/products/${product.slug}` without `encodeURIComponent`; category links use encoding |
| **SEO risk** | Minimal for ASCII slugs; edge cases with special characters |
| **Priority** | Low |
| **Complexity** | Small |
| **Solution** | Use `getProductPath()` consistently |
| **Tests** | Product slug with non-ASCII after transliteration |

---

### LOW-06 — CartProvider wraps entire public site

| Field | Value |
|---|---|
| **Affected templates** | Global (`app/layout.tsx`) |
| **Evidence** | L71–73 `CartProvider` in root layout |
| **SEO risk** | Indirect — increases client JS on content pages; content still SSR |
| **Priority** | Low |
| **Complexity** | Large |
| **Solution** | Defer cart provider to shop/product/cart routes only (architectural) |
| **Tests** | Bundle analyzer; Lighthouse performance |

---

## Section findings (audit checklist)

### 1. Indexability

| Item | Status | Notes |
|---|---|---|
| `robots.txt` | ✅ Good | `app/robots.ts` — allow `/`, sitemap declared |
| XML sitemap | ✅ Good | Dynamic products, product categories (incl. subcategories), blog, events |
| Funnel noindex | ✅ Good | cart, checkout, thank-you, campaign-checkout |
| Gaps | ⚠️ | `/login`, `/cart` not in robots disallow; filtered `/shop`/`/blog` indexable |
| Sitemap coverage | ⚠️ | Missing: individual occasion landings; `/products` (redirect only) |
| Important public pages in sitemap | ✅ | `/`, `/shop`, `/categories`, `/occasions`, legal, blog, events |

### 2. Canonical addresses

| URL type | Canonical | Issue |
|---|---|---|
| `/` | `/` (layout) | OK |
| `/shop` | `/shop` always | ⚠️ Same canonical for all filter combos |
| `/categories`, `/categories/[slug]` | Set | ✅ Good |
| `/products/[slug]` | Set | ✅ Good |
| `/blog`, `/blog/[slug]` | Set | ⚠️ Blog filters share `/blog` canonical implicitly via static metadata only |
| `/events`, `/events/[slug]` | Set | ✅ Good |
| Filtered shop URLs | `/shop` | ⚠️ Should noindex or redirect to category canonical |

### 3. Status codes and redirects

| Case | Behavior | Status |
|---|---|---|
| Valid product slug | 200 | ✅ |
| UUID product URL | 308 → slug | ✅ `permanentRedirect` |
| Historical product slug | 308 → current slug | ✅ |
| Invalid product | 404 | ✅ |
| `/products` | 307 → `/shop` | ⚠️ Should be 308 |
| Invalid category | 404 | ✅ |
| Redirect loops | Guarded | ✅ `shouldRedirectHistoricalSlug` in slug tests |
| `/auth/confirm` | 302 redirects | OK (non-indexable) |

### 4. URL structure

| Pattern | Status |
|---|---|
| `/products/[slug]` | ✅ Primary product URL |
| `/categories/[slug]` | ✅ New hierarchy-aware landing |
| `/shop?product=` | ⚠️ Duplicates category URLs |
| `/shop?occasion=` | ⚠️ No dedicated landing in sitemap |
| Legacy `?category=` | ⚠️ Still supported in shop (`app/shop/page.tsx` L55–89) |
| Trailing slash | Default Next.js (no trailing slash) — OK |
| Encoding | Mostly consistent |

### 5. Duplicate content

| Scenario | Risk | Mitigation today |
|---|---|---|
| Parent category includes child products | ✅ By design | Same listing intent, not duplicate templates if shop filters canonicalized |
| `/shop?product=` vs `/categories/` | 🔴 High | None effective |
| Multi-category products | ✅ OK | Single product URL; multiple category entry points |
| Search/filters/sort | 🔴 High | Canonical to `/shop` only — insufficient alone |

### 6. Faceted navigation

| Parameter | Indexable? | Recommended |
|---|---|---|
| (none) | Yes | `/shop` |
| `product` only | No | Canonical/redirect → `/categories/{slug}` |
| `occasion` only | Debatable | Hub `/occasions` or future `/occasions/[slug]` |
| `price`, `sort`, `q` | No | noindex |
| `personalization`, `promotions` | No | noindex |
| Combined params | No | noindex |
| Legacy `category` | No | 301 to new param or category URL |

### 7. Metadata

| Area | Status |
|---|---|
| Unique titles | ✅ Per-route or dynamic |
| Meta descriptions | ✅ Most routes |
| H1 structure | ✅ Heroes use single H1; listings use H2 for products |
| Open Graph | ✅ Most routes; product type suboptimal |
| Twitter | ⚠️ Root + products; missing on categories |
| Alt text | ✅ Category heroes, product images use descriptive alts |
| Missing records | ⚠️ Category `{}`; product/blog/event handle better |

### 8. JavaScript rendering

| Content | Server-rendered? |
|---|---|
| Product grids | ✅ RSC in shop/category/home |
| Product detail (title, price, description) | ✅ |
| Category names/counts | ✅ |
| Nav/footer links | ✅ |
| Product card carousel controls | Client-only enhancement |
| Cart state | Client — not needed for crawl |

**Verdict:** Core commerce content is crawlable without JS execution.

### 9. Structured data

| Schema | Present? |
|---|---|
| Product + Offer | ✅ Partial — availability wrong |
| BreadcrumbList | ✅ category, product, blog, event |
| Organization/WebSite | ✅ root layout |
| Article | ✅ `/blog/[slug]` |
| Event | ✅ `/events/[slug]` |

### 10. Categories (hierarchy)

| Requirement | Status |
|---|---|
| Breadcrumbs parent → child | ✅ Visual in hero (`app/categories/[slug]/page.tsx` L100–112) |
| Parent includes child products | ✅ `getCategoryFamilySlugs` |
| Sitemap all product categories | ✅ Including subcategories |
| Canonical on category pages | ✅ |
| Empty categories | ✅ `noindex, follow` + sitemap exclusion |
| Subcategories on `/categories` index | ✅ Top-level only (`app/categories/page.tsx` L138–141) |

### 11. Product variants and availability

| Requirement | Status |
|---|---|
| Variants create duplicate URLs? | ✅ No — options are query/state on single product URL |
| Sold-out handling | ✅ UI + `orderable` flag |
| Schema availability | 🔴 Always PreOrder |
| Old slug redirects | ✅ UUID + history table |

### 12. Internal linking

| Path | Status |
|---|---|
| Header/footer nav | ✅ All major sections |
| Categories → subcategories → products | ✅ On category pages |
| Products → related | ✅ Up to 4 related |
| Blog → products | ⚠️ Via `/shop?product=` not `/categories/` |
| Orphan risk | Low — all product types reachable from `/shop`, `/categories`, home |
| Broken links | Not runtime-tested in this audit |

### 13. Core Web Vitals (code-level)

| Area | Finding |
|---|---|
| LCP | Hero images use `priority`; risk of multiple priorities |
| CLS | Next/Image with `fill` + aspect containers — generally good |
| INP | Client cart provider + product card carousel add main-thread work |
| Fonts | `display: swap` on Inter/Playfair — ✅ |
| Image sizes | Present on category/product cards — ✅ |
| Bundle | No audit run; global client providers present |

---

## Blockers before launch

1. ~~**CRITICAL-01** — Fix Product JSON-LD availability mapping~~ ✅ Phase 1
2. ~~**CRITICAL-02** — Resolve `/shop?product=` vs `/categories/[slug]` duplication~~ ✅ Phase 1
3. ~~**HIGH-01** — Add `noindex` to invalid category/product metadata~~ ✅ Phase 1 (category + product)
4. ~~**HIGH-03** — Implement faceted `/shop` (and `/blog`) noindex/canonical policy~~ ✅ Phase 1
5. ~~**MEDIUM-09** — Confirm `category_hierarchy.sql` applied in production Supabase~~ ✅ Confirmed

**Phase 2 complete (local, uncommitted):**

1. ~~**HIGH-04** — Empty category handling~~ ✅
2. ~~**HIGH-05** — BreadcrumbList JSON-LD~~ ✅
3. ~~**MEDIUM-01** — Organization/WebSite schema~~ ✅
4. ~~**MEDIUM-02** — Article/Event JSON-LD~~ ✅
5. ~~**MEDIUM-04** — Category Twitter metadata~~ ✅
6. ~~**MEDIUM-07** — robots.txt utility disallow~~ ✅
7. ~~**LOW-01** — Login/account noindex~~ ✅

## Recommended after launch (Phase 4 — performance)

1. **LOW-02** — Product card carousel server/client split
2. **LOW-03** — LCP priority tuning (single candidate per page)
3. **LOW-06** — CartProvider scope reduction

---

## Recommended implementation order

| Phase | Items | Est. effort |
|---|---|---|
| **1 — Launch blockers** | CRITICAL-01, CRITICAL-02, HIGH-01, HIGH-03, migration verify | 1–2 days |
| **2 — Rich results + indexability** ✅ | HIGH-04, HIGH-05, MEDIUM-01, MEDIUM-02, MEDIUM-04, MEDIUM-07, LOW-01 | Done (local) |
| **3 — Content & URL strategy** ✅ | MEDIUM-03, MEDIUM-05, MEDIUM-06, MEDIUM-08, not-found metadata | Done (local) |
| **4 — Performance polish** | LOW-02, LOW-03, LOW-06 | 2+ days |

---

## Validation commands and manual checks

### Local (safe)

```bash
cd D:\Cursor\src
npm run typecheck
npm run lint
npm test
npm run build
git status
git diff --stat
git diff --check
```

### Production / Preview (manual, read-only)

```bash
# robots + sitemap
curl -s https://vemidi-store.vercel.app/robots.txt
curl -s https://vemidi-store.vercel.app/sitemap.xml | head -100

# Status codes
curl -I https://vemidi-store.vercel.app/products
curl -I https://vemidi-store.vercel.app/products/{valid-slug}
curl -I https://vemidi-store.vercel.app/products/{uuid}
curl -I https://vemidi-store.vercel.app/products/{old-slug}
curl -I https://vemidi-store.vercel.app/categories/{valid-slug}
curl -I https://vemidi-store.vercel.app/categories/invalid-slug-xyz
curl -I "https://vemidi-store.vercel.app/shop?product={category-slug}"
curl -I "https://vemidi-store.vercel.app/shop?q=test&sort=price-asc"

# Metadata spot-check
curl -s https://vemidi-store.vercel.app/categories/{slug} | findstr /i "canonical robots description"
curl -s https://vemidi-store.vercel.app/products/{slug} | findstr /i "application/ld+json canonical"
```

### External tools

- [Google Rich Results Test](https://search.google.com/test/rich-results) — product, blog, event URLs
- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) — OG tags
- Google Search Console — Coverage, Page indexing, Sitemaps, Core Web Vitals
- Screaming Frog (≤500 URLs) — faceted URL discovery, canonical conflicts, 404s

### Supabase migration check

```sql
-- parent_id column exists
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'categories' and column_name = 'parent_id';

-- hierarchy validator present
select proname from pg_proc
join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
where pg_namespace.nspname = 'public' and proname = 'validate_category_hierarchy';
```

---

## Positive findings (keep)

- Product UUID + historical slug **`permanentRedirect`** with query allowlist (`lib/product-url.ts`, `lib/product-route.ts`)
- Checkout funnel pages explicitly **`noindex`**
- **`metadataBase`** set from `NEXT_PUBLIC_SITE_URL` (`app/layout.tsx`, `lib/site-url.ts`)
- **`lang="bg"`** on `<html>`
- Category hierarchy logic aggregates child products on parent pages without duplicate product URLs
- Sitemap already includes **subcategory** URLs with differentiated priority
- Server Components for catalog, category, product, blog, and event pages
- Font **`display: swap`** configured

---

---

## Phase 2 changed files (uncommitted)

### New
- `components/seo/json-ld.tsx` — server-side JSON-LD renderer
- `lib/seo/json-ld.ts` — safe serialization (`compactJsonLd`, `serializeJsonLd`)
- `lib/seo/breadcrumbs.ts` — BreadcrumbList helper + route builders
- `lib/seo/category-indexability.ts` — empty category detection + sitemap filter
- `lib/seo/category-metadata.ts` — category metadata (Twitter, empty noindex)
- `lib/seo/organization-schema.ts` — Organization + WebSite from `config/site.ts`
- `lib/seo/article-schema.ts` — Article JSON-LD
- `lib/seo/event-schema.ts` — Event JSON-LD (conditional fields)
- `tests/breadcrumb-schema.test.ts`
- `tests/organization-schema.test.ts`
- `tests/article-schema.test.ts`
- `tests/event-schema.test.ts`
- `tests/category-indexability.test.ts`
- `tests/robots-config.test.ts`

### Modified
- `app/layout.tsx` — site-level Organization/WebSite JSON-LD
- `app/robots.ts` — extended disallow paths
- `app/sitemap.ts` — excludes empty product categories
- `app/categories/[slug]/page.tsx` — breadcrumbs, metadata, empty noindex
- `app/products/[slug]/page.tsx` — BreadcrumbList JSON-LD
- `app/blog/[slug]/page.tsx` — Article + BreadcrumbList JSON-LD
- `app/events/[slug]/page.tsx` — Event + BreadcrumbList JSON-LD
- `app/login/page.tsx` — explicit noindex
- `app/account/page.tsx` — explicit noindex
- `docs/TECHNICAL-SEO-AUDIT.md` — Phase 2 status

*Phase 3 complete locally. Awaiting review before commit/deploy.*

### Phase 3 changed files (uncommitted)

**New:** `app/occasions/[slug]/page.tsx`, `lib/seo/occasion-indexability.ts`, `lib/seo/occasion-metadata.ts`, `lib/seo/page-metadata.ts`, `lib/seo/product-metadata.ts`, `lib/seo/sitemap-last-modified.ts`, `tests/occasion-metadata.test.ts`, `tests/page-metadata.test.ts`, `tests/product-metadata.test.ts`, `tests/sitemap-last-modified.test.ts`

**Modified:** `app/categories/page.tsx`, `app/not-found.tsx`, `app/occasions/page.tsx`, `app/page.tsx`, `app/products/[slug]/page.tsx`, `app/shop/page.tsx`, `app/sitemap.ts`, `components/category/category-showcase-card.tsx`, `lib/category-url.ts`, `lib/seo/breadcrumbs.ts`, `lib/seo/shop-route.ts`, `lib/storefront/repository.ts`, `lib/storefront/types.ts`, `lib/storefront/mappers.ts`, test files, `docs/TECHNICAL-SEO-AUDIT.md`

#### Sitemap timestamp rules (Phase 3 corrective review)

| Entity | `lastModified` source |
|---|---|
| Product | `products.updated_at ?? products.created_at` |
| Product category | Latest product timestamp from direct assignments **and** all child subcategories (`getCategoryFamilySlugs`) |
| Occasion category | Direct product assignments only (unchanged) |
| Static routes | Omitted |
| Blog / event | `updated_at` from content tables |
