# Production SEO Verification

**Site:** https://vemidi-store.vercel.app  
**Initial verification date:** 2026-06-15  
**Corrective review date:** 2026-06-15 (final pre-commit pass, local production build on `main`, uncommitted)  
**Initial git baseline:** `2bbbe2c` (main)  
**Method:** Read-only HTTP fetch (Googlebot user-agent), HTML/metadata/JSON-LD parse, `robots.txt` + `sitemap.xml` review; corrective pass adds local `npm run build` + `npm start` smoke tests  
**Scope:** Pre-launch technical SEO audit — corrective review applied code fixes locally (not deployed)

---

## Executive summary

| Area | Initial (production) | After corrective review (local build) |
|---|---|---|
| robots.txt / sitemap | **Pass** | **Pass** (unchanged — production) |
| Indexable page metadata | **Mostly pass** | **Pass** — hub OG added for `/shop`, `/categories`, `/blog` |
| Utility / funnel noindex | **Pass** | **Pass** |
| Legacy URL redirects | **Partial** — RSC 308, HTTP 200 on document GET | **Partially fixed locally** — middleware **308** for `/products`, `?product=`, `?occasion=`; legacy `?category=` stays RSC (no DB in middleware) |
| Invalid URLs | **Fail** — soft 404 (HTTP 200 + noindex HTML) | **Pass** — HTTP **404** + `noindex, nofollow` (root `loading.tsx` removed) |
| Hub categories | **Partial** | **Partial** (unchanged indexability rules) |
| Bad category slug | **Fail** — `sakndinavski muh` linked from `/categories` | **SQL prepared, not applied** — idempotent migration ready |

**Launch status:** Awaits **deploy** of app fixes + **SQL apply** (M-05) + **production recheck** (GSC URL Inspection for H-01/H-02).

---

## Corrective review — findings first

| ID | Severity | Status | Summary |
|---|---|---|---|
| H-01 | High | **Fixed locally** | Invalid product/category/occasion/blog slugs now return HTTP **404** with `notFound()` + `notFoundPageMetadata` (`noindex, nofollow`). Root cause of production soft 404 was global `app/loading.tsx` streaming a 200 shell before `notFound()` resolved. |
| H-02 | High | **Partially fixed locally** | Middleware **308** for document GET/HEAD on `/products`, `?product=`, `?occasion=` (validated slug only; POST never redirected). Legacy `?category=` remains **Partial** — product vs occasion requires catalog lookup in RSC; URLs are **noindex** and not a launch blocker. |
| M-03 | Medium | **Fixed locally** | Page-level `openGraph.url`, title, description on `/shop`, `/categories`, `/blog`. Canonical/index rules unchanged. |
| M-05 | Medium | **SQL prepared, not applied** | `supabase/fix_category_slug_skandinavski_muh.sql` — idempotent slug fix `sakndinavski muh` → `skandinavski-muh`. Not executed. |

**`app/loading.tsx` trade-off (confirmed):** Restoring global `app/loading.tsx` on a local production build **reintroduces soft 404** (HTTP 200 before `notFound()` resolves). Global file stays **removed**; `app/shop/loading.tsx` retained for catalog UX only. No `loading.tsx` on dynamic product/category/occasion/blog segments — required for real HTTP 404.

**Middleware safety (final pass):** SEO redirects limited to **GET/HEAD**; slug params must match `^[a-z0-9]+(?:-[a-z0-9]+)*$` (rejects spaces, encoded spaces, slashes, invalid chars). Bare `POST /products` returns **404** (not 308) via `app/products/page.tsx` guard — middleware handles GET/HEAD only.

**Legacy product UUID / stale slug redirect:** Unchanged in app code (`lib/product-route.ts`, `getStorefrontProductPage`). Smoke-tested locally: valid slug `/products/plik-za-pari` → 200; invalid slug → 404; UUID path uses same resolver (redirect when product exists in DB).

---

## HTTP status — before / after (local production build)

Measured with `curl -sI` (no redirect follow) unless noted. **Before** = pre-fix local build or production audit; **After** = current local build with corrective changes.

### H-01 — Invalid URLs (soft 404)

| URL | Before HTTP | After HTTP | After robots (HTML) | Notes |
|---|---:|---:|---|---|
| `/products/invalid-slug-xyz` | 200 | **404** | `noindex, nofollow` | `notFound()` in page + metadata |
| `/categories/invalid-cat` | 200 | **404** | `noindex, nofollow` | |
| `/occasions/invalid-occ` | 200 | **404** | `noindex, nofollow` | |
| `/blog/invalid-post` | 200 | **404** | `noindex, nofollow` | |

**Fix detail:** Removed global `app/loading.tsx`; moved skeleton to `app/shop/loading.tsx` only so `notFound()` can set status before bytes are committed.

### H-02 — Redirect semantics (document GET/HEAD, `curl -sI`, no follow)

| URL | H-02 status | Request | HTTP | Location | Mechanism |
|---|---|---|---:|---|---|
| `/products` | **Fixed locally** | GET | **308** | `/shop` | Middleware |
| `/products` | **Fixed locally** | HEAD | **308** | `/shop` | Middleware |
| `/shop?product=kutii` | **Fixed locally** | GET | **308** | `/categories/kutii` | Middleware (slug validated) |
| `/shop?occasion=svatba` | **Fixed locally** | GET | **308** | `/occasions/svatba` | Middleware (slug validated) |
| `/shop?category=kutii` | **Partial** | GET | **200** | — | RSC + catalog lookup (product vs occasion) |
| `/shop?category=kutii` | **Partial** | RSC (`RSC: 1`) | **200** | 308 in RSC body → `/categories/kutii` | App route (unchanged) |
| `/shop?product=sakndinavski%20muh` | **N/A** | GET | **200** | — | Invalid slug — no middleware redirect |
| `/shop?product=kutii` | Safety | POST | **200/405** | — | **Not redirected** (method guard) |

**H-02 correction:** Initial production measurement conflated **RSC flight responses** (always 200 with embedded redirect) with **document navigation**. Middleware handles high-traffic legacy paths without DB. **`?category=`** is a limited legacy edge case: faceted URL stays **noindex**, redirect still works via RSC after catalog resolution — **not a launch blocker**.

### Middleware method + slug safety (local)

| Check | Expected | Actual |
|---|---|---|
| GET `/products` | 308 | **308** |
| HEAD `/products` | 308 | **308** |
| POST `/products` | No redirect | **404** | `app/products/page.tsx` — bare path not redirected for unsafe methods |
| POST `/shop?product=kutii` | No redirect | **200** | Middleware method guard |
| GET `/shop?product=invalid%20slug` | No redirect | **200** (invalid slug rejected) |

---

## 1. HTTP & indexability (production baseline — pre-fix)

| URL | Expected | Actual (production) | Status | Pass/Fail | Evidence |
|---|---|---|---|---|---|
| `/` | 200, index | 200, `robots: index, follow`, canonical `https://vemidi-store.vercel.app` | 200 | **Pass** | 1× H1; Organization + WebSite JSON-LD |
| `/shop` | 200, index | 200, `index, follow`, canonical `/shop` | 200 | **Pass** | 1× H1 „Продукти“; product slugs in SSR HTML |
| `/categories` | 200, index | 200, `index, follow`, canonical `/categories` | 200 | **Pass** | 1× H1 |
| `/categories/kutii` | 200, index or hub | 200, **`noindex, follow`**, canonical `/categories/kutii` | 200 | **Partial** | Renders product grid; excluded from sitemap (0 direct products in family) |
| `/categories/plik-za-pari` | 200, index (leaf category) | 200, `index, follow`, canonical `/categories/plik-za-pari` | 200 | **Pass** | In sitemap; 1× H1; BreadcrumbList JSON-LD |
| `/categories/kutii/podarachni-kutii` | 404 or redirect | **404** | 404 | **Pass** | Flat category URLs only (`/categories/{slug}`) — nested path not supported |
| `/occasions/svatba` | 200, index | 200, `index, follow`, canonical `/occasions/svatba` | 200 | **Pass** | In sitemap; page-specific OG/Twitter |
| `/products/plik-za-pari` | 200, index | 200, `index, follow`, canonical `/products/plik-za-pari` | 200 | **Pass** | Product + Offer + BreadcrumbList JSON-LD |
| `/products/invalid-slug-xyz` | 404, noindex | **200**, `noindex, nofollow` (production) → **404** (local fix) | 200→404 | **Fixed locally** | Was soft 404 |
| `/categories/invalid-cat` | 404, noindex | **200** (production) → **404** (local fix) | 200→404 | **Fixed locally** | Was soft 404 |
| `/occasions/invalid-occ` | 404, noindex | **200** (production) → **404** (local fix) | 200→404 | **Fixed locally** | Was soft 404 |
| `/cart` | 200, noindex | 200, `noindex, nofollow` | 200 | **Pass** | robots.txt `Disallow: /cart` |
| `/checkout` | 200, noindex | 200, `noindex, nofollow` | 200 | **Pass** | robots.txt disallow |
| `/login` | 200, noindex | 200, `noindex, nofollow` | 200 | **Pass** | robots.txt disallow |
| `/account` | 200, noindex | 200, `noindex, nofollow` | 200 | **Pass** | robots.txt disallow |
| `/thank-you` | 200, noindex | 200, `noindex, nofollow` | 200 | **Pass** | robots.txt disallow; 0× H1 |

**Note on subcategories:** Production uses **flat** `/categories/{slug}` routes. Indexable leaf example: `/categories/plik-za-pari`. Parent hub `/categories/kutii` is intentionally `noindex` when the category family has no directly tagged products.

---

## 2. robots.txt & sitemap.xml

| Check | Expected | Actual | Pass/Fail | Evidence |
|---|---|---|---|---|
| Production host | `https://vemidi-store.vercel.app` | Host + sitemap URL correct | **Pass** | `Host: https://vemidi-store.vercel.app`, `Sitemap: …/sitemap.xml` |
| Sitemap reachable | 200 | 200 | **Pass** | 38 URLs |
| Canonical slug URLs | `/products/{slug}`, `/categories/{slug}`, `/occasions/{slug}` | All locs use slug paths | **Pass** | No UUID product IDs |
| No query params | None | None | **Pass** | |
| No utility pages | None | None | **Pass** | No cart/checkout/login/cart |
| No duplicates | 0 | 0 | **Pass** | |
| Empty categories excluded | Non-indexable hubs omitted | `kutii`, `bijuta` absent; only indexable categories included | **Pass** | 3 category URLs: `plik-za-pari`, `family`, `tvorcheski-komplekti` |
| Occasions in sitemap | Indexable occasions | 8 occasion URLs | **Pass** | incl. `svatba` |
| Products in sitemap | Published products | 7 product URLs | **Pass** | slug-only |

---

## 3. Metadata

| URL | Title unique | Description | Canonical (production) | robots | OG / Twitter | H1 count | Pass/Fail |
|---|---|---|---|---|---|---:|---|
| `/` | Yes | Yes | Yes | index | Yes (site default) | 1 | **Pass** |
| `/shop` | Yes | Yes | `/shop` | index | **Page-level OG `/shop`** (local fix) | 1 | **Pass** (local) |
| `/categories/plik-za-pari` | Yes | Yes | Yes | index | Page-specific + image | 1 | **Pass** |
| `/categories/kutii` | Yes | Yes | Yes | **noindex** | Page-specific | 1 | **Partial** |
| `/occasions/svatba` | Yes | Yes | Yes | index | Page-specific + image | 1 | **Pass** |
| `/products/plik-za-pari` | Yes | Yes | Yes | index | Page-specific + product image | 1 | **Pass** |
| `/blog` | Yes | Yes | `/blog` | index | **Page-level OG `/blog`** (local fix) | 1 | **Pass** (local) |
| `/categories` (hub) | Yes | Yes | `/categories` | index | **Page-level OG `/categories`** (local fix) | 1 | **Pass** (local) |
| `/blog/blog-tvorcheski-komplekti` | Yes | Yes | Yes | index | Article schema | 1 | **Pass** |
| Invalid URLs | N/A | N/A | **`/`** (legacy) | noindex | Root layout | 0 | **Fixed** — HTTP 404 + noindex |
| Funnel pages | Yes | Layout default | **`/`** | noindex | Root layout | 0–1 | **Partial** |

---

## 4. Redirects

### Production baseline (pre-fix)

Implementation used Next.js App Router `permanentRedirect()` → RSC payload `NEXT_REDIRECT;replace;{path};308;`. **Initial HTTP response was 200** (HEAD and GET); redirect executed client-side / during RSC navigation.

| Source | Expected target | RSC target | RSC code | HTTP status (doc GET) | Pass/Fail |
|---|---|---|---|---:|---|
| `/products` | `/shop` | `/shop` | 308 | **200** | **Partial** |
| `/shop?product=kutii` | `/categories/kutii` | `/categories/kutii` | 308 | **200** | **Partial** |
| `/shop?category=kutii` | `/categories/kutii` | `/categories/kutii` | 308 | **200** | **Partial** |
| `/shop?occasion=svatba` | `/occasions/svatba` | `/occasions/svatba` | 308 | **200** | **Partial** |
| `/shop?q=test` | Stay on shop, noindex | (no redirect) | — | 200 | **Pass** |

### After corrective review (local)

| Source | H-02 status | HTTP (GET) | Location | Mechanism |
|---|---|---:|---|---|
| `/products` | **Fixed locally** | **308** | `/shop` | Middleware (GET/HEAD only) |
| `/shop?product=kutii` | **Fixed locally** | **308** | `/categories/kutii` | Middleware + slug validation |
| `/shop?occasion=svatba` | **Fixed locally** | **308** | `/occasions/svatba` | Middleware + slug validation |
| `/shop?category=kutii` | **Partial** | **200** (doc) / RSC 308 | `/categories/kutii` via RSC | App route + catalog (unchanged) |
| `/shop?q=test` | **Pass** | **200** | — | Faceted noindex (unchanged) |

† **`product` query param = product-category slug**, not product detail slug. Redirect to `/categories/plik-za-pari`, not `/products/plik-za-pari`. Matches codebase (`lib/seo/shop-route.ts`).

---

## 5. Structured data

| Page | Expected | Actual | Pass/Fail | Notes |
|---|---|---|---|---|
| All public pages | Organization + WebSite | Present globally | **Pass** | Real contact/social from `siteConfig` |
| `/products/plik-za-pari` | Product, Offer, availability | `Product`, `Offer price=15.00`, `availability=PreOrder` | **Pass** | Matches made-to-order product |
| `/categories/plik-za-pari` | BreadcrumbList | 3 items | **Pass** | |
| `/occasions/svatba` | BreadcrumbList | 3 items | **Pass** | |
| `/blog/blog-tvorcheski-komplekti` | Article | Article + BreadcrumbList | **Pass** | Real headline |
| `/events/event-textil` | Event | Event + Offer + BreadcrumbList | **Pass** | „Рисуване върху текстил“ |
| Invalid / funnel | No fake Product | Only Organization + WebSite | **Pass** | |

No duplicate conflicting Product schemas observed. No fabricated prices on missing pages.

---

## 6. Rendering & links

| Check | Expected | Actual | Pass/Fail | Evidence |
|---|---|---|---|---|
| SSR product content on `/shop` | Product titles/slugs in HTML | Present (`plik-za-pari`, product grid) | **Pass** | ~163 KB HTML |
| Breadcrumbs use canonical paths | `/categories/{slug}`, `/products/{slug}` | JSON-LD + visible nav use slug URLs | **Pass** | |
| Homepage internal links | Valid canonical URLs | Most valid; **`/occasions/new-home`** resolves (noindex occasion) | **Partial** | Page exists, not in sitemap |
| Bad category slug link | Valid slug | `/categories/sakndinavski%20muh` → 404 until SQL applied | **Pending** | SQL migration prepared |
| Product images | Load | Supabase CDN URLs in OG/product pages | **Pass** | No broken-image HTTP errors sampled |
| Sample sitemap URLs | 200 | `/products/plik-za-pari-copy-2` → 200 index | **Pass** | Content naming (`copy-2`) is editorial, not SEO breakage |

---

## Issues by priority

### Critical

_None identified that prevent indexing of primary revenue templates._

### High

| ID | Issue | Status | Resolution |
|---|---|---|---|
| H-01 | Soft 404 — HTTP 200 on missing slugs | **Fixed locally** | `notFound()` in dynamic routes; removed global `app/loading.tsx`; shop-only loading skeleton |
| H-02 | Redirects emit HTTP 200 on document GET | **Partially fixed locally** | Middleware 308 for `/products`, `?product=`, `?occasion=` (GET/HEAD, validated slug). `?category=` remains RSC — noindex legacy edge case, not launch blocker. |

### Medium

| ID | Issue | Status |
|---|---|---|
| M-01 | Hub categories **`noindex`** but linked from nav/home | Unchanged (intentional) |
| M-02 | **`/occasions/new-home`** linked on homepage, **`noindex`**, not in sitemap | Unchanged |
| M-03 | Listing hubs missing page-level OG | **Fixed locally** |
| M-04 | Invalid pages canonical to **`/`** | Mitigated by HTTP 404 |
| M-05 | Slug **`sakndinavski muh`** | **SQL prepared, not applied** |

### Low

| ID | Issue | Evidence |
|---|---|---|
| L-01 | Product meta description contains literal `\r\n` | `/products/plik-za-pari` |
| L-02 | `/thank-you`, `/account` missing H1 | Funnel pages already noindex |
| L-03 | Sitemap product slug `plik-za-pari-copy-2` | Editorial duplicate naming |
| L-04 | Utility pages canonical = homepage | Acceptable given `noindex` |

---

## Category slug SQL migration (M-05)

**File:** `supabase/fix_category_slug_skandinavski_muh.sql`

**Why safe:**
- Updates **only** `categories.slug` for known bad values (`sakndinavski muh`, `sakndinavski-muh`)
- Does **not** change category `id` or `product_categories` relations
- Aborts if canonical `skandinavski-muh` already exists on a **different** row (collision guard)
- Idempotent — re-run raises notice when no bad rows remain

**Backup before apply:**
```sql
SELECT id, slug, name, category_type, parent_id
FROM public.categories
WHERE slug IN ('sakndinavski muh', 'sakndinavski-muh', 'skandinavski-muh');
```

**Apply:**
- **Supabase SQL Editor:** paste and run the entire file contents.
- **psql:** `\i supabase/fix_category_slug_skandinavski_muh.sql`

(Not executed in this review.)

**Check after apply:**
```sql
SELECT id, slug FROM public.categories
WHERE slug ILIKE '%skandinavski%' OR slug ILIKE '%sakndinavski%';
-- Expect: one row with slug = 'skandinavski-muh'; zero rows with space or 'sakndinavski'
```

---

## Checklist summary

| Section | Pass | Partial | Fail / Fixed |
|---|---:|---:|---|
| HTTP & indexability | 11 | 1 | 3 → **fixed locally** |
| robots / sitemap | 9 | 0 | 0 |
| Metadata | 6 → **9 local** | 4 → **1** | 1 → **fixed** |
| Redirects | 1 | 1 (`?category=`) | 4 → **fixed locally** |
| Structured data | 7 | 0 | 0 |
| Rendering & links | 4 | 1 | 1 → **pending SQL** |

---

## Launch recommendation

**Status: awaits deploy + SQL apply + production recheck.**

App fixes (H-01, partial H-02, M-03) are ready for commit review locally. **Do not treat as fully SEO-verified on production** until:

1. Deploy corrective app changes to https://vemidi-store.vercel.app
2. Apply `supabase/fix_category_slug_skandinavski_muh.sql` when approved (M-05)
3. Re-run production HTTP checks and GSC URL Inspection for H-01/H-02

**Strengths after deploy:** Clean robots/sitemap; slug-based canonical URLs; funnel pages blocked; HTTP 404 for missing entities; middleware 308 for primary legacy redirects; hub Open Graph.

**Known partial items (non-blocking):** `?category=` document GET stays 200 until RSC redirect (noindex); hub category noindex (M-01).

**Awaiting review before commit.**

---

*Initial verification read-only against production. Corrective review uses local production build; no commit, push, deploy, or production SQL executed.*
