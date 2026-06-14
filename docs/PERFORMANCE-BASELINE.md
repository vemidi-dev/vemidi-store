# Performance Baseline — VeMiDi crafts (Core Web Vitals / Phase 4)

**Project:** `D:\Cursor\src`  
**Baseline date:** 2026-06-14  
**Production URL:** https://vemidi-store.vercel.app  
**Git baseline:** `47cea64` (Technical SEO Phase 3)  
**Capture method:** Lighthouse CLI 12.6.1 (lab), headless Chrome, Performance category only  
**Branch:** `main`  
**Scope:** Core Web Vitals baseline for Technical SEO Phase 4 (no code changes in this document)

---

## Methodology

| Setting | Value |
|---|---|
| Tool | `npx lighthouse@12.6.1` |
| Mobile | `--form-factor=mobile --screenEmulation.mobile=true` |
| Desktop | `--preset=desktop` |
| Throttling | Lighthouse default simulated mobile / desktop |
| INP | **Not available in lab runs** — TBT used as main-thread proxy on mobile |
| Raw reports | Local artifacts `tmp-lh-*.json` (not committed) |

**Pages audited:**

| Template | URL |
|---|---|
| Homepage | `/` |
| Shop | `/shop` |
| Product category | `/categories/kutii` |
| Occasion landing | `/occasions/svatba` |
| Product detail | `/products/plik-za-pari` |

**Note:** An initial product URL (`/products/sreburen-medalyon`) returned **404** in production; baseline product metrics use a live catalog slug (`plik-za-pari`).

---

## Summary scorecard

| Page | Mobile Perf | Desktop Perf | Mobile LCP | Desktop LCP | Mobile CLS | Desktop CLS | Mobile TBT | Desktop TBT | Mobile FCP | Desktop FCP |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `/` | **72** | **98** | 2.9 s | 0.7 s | 0.031 | 0.063 | 1,080 ms | 90 ms | 1.2 s | 0.3 s |
| `/shop` | **70** | **99** | 3.2 s | 0.7 s | 0.031 | 0.057 | 1,070 ms | 30 ms | 1.2 s | 0.4 s |
| `/categories/kutii` | **72** | **97** | 3.3 s | 0.8 s | 0.031 | 0.104 | 890 ms | 30 ms | 1.0 s | 0.4 s |
| `/occasions/svatba` | **85** | **99** | 2.9 s | 0.8 s | 0.031 | 0.024 | 410 ms | 20 ms | 1.0 s | 0.4 s |
| `/products/plik-za-pari` | **90** | **99** | 3.0 s | 0.7 s | 0.000 | 0.057 | 130 ms | 50 ms | 1.7 s | 0.4 s |

### Cross-cutting findings

| Metric | Mobile | Desktop | Assessment |
|---|---|---|---|
| **Performance gap** | 58–90 | 92–99 | Mobile is the constraint; desktop is healthy |
| **LCP** | 2.9–3.4 s | 0.7–0.8 s | Mobile LCP above 2.5 s “good” threshold on all hero/listing templates |
| **CLS** | ≤ 0.031 (good) except product N/A | 0.024–0.129 | Category/product desktop CLS elevated (0.10+) — investigate layout shifts |
| **TBT / INP proxy** | 410–1,080 ms | 20–150 ms | Listing pages dominated by JS main-thread cost on mobile |
| **FCP** | 1.0–1.7 s | 0.3–0.4 s | Mobile FCP acceptable; product detail slower FCP (1.7 s) |

---

## Per-page analysis

### 1. Homepage (`/`)

| | Mobile | Desktop |
|---|---|---|
| Performance | 72 | 98 |
| LCP | 2.9 s | 0.7 s |
| CLS | 0.031 | 0.063 |
| TBT | 1,080 ms | 90 ms |
| FCP | 1.2 s | 0.3 s |
| INP (lab) | n/a | n/a |

**LCP element (identical Mobile/Desktop pattern):**

| Field | Value |
|---|---|
| Element | Hero `<img>` (`next/image`, `fill`, `object-cover`) |
| Alt | „Персонализиран дървен подарък за kръщене“ |
| Selector | `section.overflow-hidden > div.grid > div.relative > img.object-cover` |
| Source | `/_next/image?url=%2Fassets%2Fhome-hero.webp` |
| Component chain | `app/page.tsx` → `components/home/home-hero.tsx` (L71–78, `priority`) |

**Mobile LCP phase breakdown (homepage):**

| Phase | Duration |
|---|---:|
| TTFB | 168 ms |
| Resource load delay | **1,089 ms** |
| Resource load duration | 74 ms |
| Element render delay | **747 ms** |

**LCP discovery checklist:** request discoverable ✅, not lazy ✅, **`fetchpriority=high` not detected ❌**

| Category | Issue | Likely cause |
|---|---|---|
| **Images** | High resource load delay + render delay | Hero competes with header logo (`priority` in `header.tsx` L31); two `priority` images on same view |
| **JavaScript** | TBT ~1,080 ms | Global `CartProvider` (`app/layout.tsx`), header client islands, Next.js chunks `1255-*.js`, `4bd1b696-*.js` |
| **CSS** | Minor | Tailwind bundle via Next; no major render-blocking flagged on home mobile |
| **Fonts** | OK | `next/font` Inter + Playfair, `display: swap` (`app/layout.tsx`) — Lighthouse `font-display` pass |
| **External** | None on LCP | Static asset `/assets/home-hero.webp` via Vercel `_next/image` |

---

### 2. Shop (`/shop`)

| | Mobile | Desktop |
|---|---|---|
| Performance | 70 | 99 |
| LCP | 3.2 s | 0.7 s |
| CLS | 0.031 | 0.057 |
| TBT | 1,070 ms | 30 ms |
| FCP | 1.2 s | 0.4 s |

**LCP element:**

| Field | Value |
|---|---|
| Element | Hero `<img>` via `VisualPageHero` |
| Alt | „Ръчно изработени продукти от VeMiDi crafts“ |
| Source | `/_next/image?url=%2Fassets%2Fproducts.png` |
| Files | `app/shop/page.tsx` → `components/layout/visual-page-hero.tsx` (L27–35, `priority`) |

**Dominant cost:** Mobile JS (page boot ~1,650 ms + chunk `1255-*.js` ~1,333 ms) + product grid hydration via client `ProductCardMedia` on each card.

| Category | Issue | Files |
|---|---|---|
| **Images** | Hero LCP ~3.2 s mobile | `visual-page-hero.tsx`, static `/assets/products.png` |
| **JavaScript** | Highest TBT among commerce listings | `cart-provider.tsx`, `product-card-media.tsx` (`"use client"`), shop page product grid |
| **CSS** | — | — |
| **Fonts** | OK | Root layout fonts |
| **External** | Supabase images in grid (not LCP) | `next.config.ts` remote patterns; listing thumbnails |

---

### 3. Product category (`/categories/kutii`)

| | Mobile | Desktop |
|---|---|---|
| Performance | 72 | 97 |
| LCP | 3.3 s | 0.8 s |
| CLS | 0.031 | **0.104** |
| TBT | 890 ms | 30 ms |
| FCP | 1.0 s | 0.4 s |

**LCP element:**

| Field | Value |
|---|---|
| Element | Hero `<img>` (`VisualPageHero`) |
| Alt | „Ръчно izработени продукти в категория Кутийки и kошнички“ |
| Source | `/_next/image?url=%2Fassets%2Fcategories%2Fproduct%2Fkutii.png` |
| Files | `app/categories/[slug]/page.tsx` → `visual-page-hero.tsx`; image from `lib/category-images.ts` |

**Desktop CLS 0.104** — likely hero/grid layout or font swap; needs follow-up in Phase 4 (layout reservation, aspect-ratio containers).

| Category | Issue | Files |
|---|---|---|
| **Images** | Category hero PNG via `_next/image` | `getCategoryImageSrc()`, `visual-page-hero.tsx` |
| **JavaScript** | TBT ~890 ms mobile | Same global client bundle + product grid |
| **CSS** | Render-blocking CSS ~150 ms (mobile) | Next compiled CSS chunk `*.css` |
| **Fonts** | OK | — |
| **External** | — | — |

---

### 4. Occasion landing (`/occasions/svatba`)

| | Mobile | Desktop |
|---|---|---|
| Performance | 85 | 99 |
| LCP | 2.9 s | 0.8 s |
| CLS | 0.031 | 0.024 |
| TBT | 410 ms | 20 ms |
| FCP | 1.0 s | 0.4 s |

**LCP element:**

| Field | Value |
|---|---|
| Element | Hero `<img>` (`VisualPageHero`) |
| Alt | „Персонализирани подаръци за Сvatba“ |
| Source | `/_next/image?url=%2Fassets%2Foccasion-svatba.webp` |
| Files | `app/occasions/[slug]/page.tsx` → `visual-page-hero.tsx` |

**Best mobile performance among hero templates** (85) — still above LCP target; lower TBT than shop/home (fewer interactive cards above fold).

---

### 5. Product detail (`/products/plik-za-pari`)

| | Mobile | Desktop |
|---|---|---|
| Performance | 90 | 99 |
| LCP | 3.0 s | 0.7 s |
| CLS | **0.000** | 0.057 |
| TBT | **130 ms** | 50 ms |
| FCP | **1.7 s** | 0.4 s |

**LCP element:**

| Field | Value |
|---|---|
| Element | Primary gallery `<img>` |
| Alt | „Плik за pari“ |
| Selector | `div.lg:sticky > div.flex > div.relative > img.object-cover` |
| Source | `/_next/image` → **Supabase Storage** product image URL |
| Files | `app/products/[slug]/page.tsx` → `components/product/product-detail-gallery.tsx` (`"use client"`, L22–30, `priority` on first image) |

**Mobile LCP phases:**

| Phase | Duration |
|---|---:|
| TTFB | 134 ms |
| Resource load delay | **1,070 ms** |
| Resource load duration | 185 ms |
| Element render delay | **1,145 ms** |

| Category | Issue | Files |
|---|---|---|
| **Images** | Remote Supabase origin + `_next/image` optimization chain | `product-detail-gallery.tsx`, `lib/storefront/repository.ts`, Supabase CDN |
| **JavaScript** | Client gallery wrapper delays render despite low TBT | `"use client"` on gallery; add-to-cart client components below fold |
| **CSS** | Render-blocking CSS ~150 ms (mobile) | Global CSS |
| **Fonts** | OK | — |
| **External** | **Supabase Storage** on LCP critical path | `koenzvpznqcqtiixaclo.supabase.co` via `next/image` |

---

## Problem taxonomy

### Images

| ID | Finding | Affected pages | Components / files |
|---|---|---|---|
| IMG-01 | Multiple `priority` images per view (header logo + hero) | `/`, `/shop`, `/categories/*`, `/occasions/*` | `components/layout/header.tsx` L31, `home-hero.tsx` L75, `visual-page-hero.tsx` L31 |
| IMG-02 | Lighthouse reports missing `fetchpriority=high` on LCP image | All hero templates | Competing priorities; only one candidate should win |
| IMG-03 | Mobile LCP 2.9–3.3 s on optimized static heroes | Hero templates | `_next/image` q=75; consider preload link or single priority |
| IMG-04 | Product LCP from Supabase remote URL | Product detail | `product-detail-gallery.tsx`; latency in resource load + render delay |
| IMG-05 | Category heroes use PNG assets | Category/Occasion | `lib/category-images.ts`, `/assets/categories/`, `/assets/occasion-*.webp` |

### JavaScript

| ID | Finding | Affected pages | Components / files |
|---|---|---|---|
| JS-01 | Global `CartProvider` on all public pages | All | `app/layout.tsx` L76–78, `components/cart/cart-provider.tsx` |
| JS-02 | Mobile TBT 890–1,080 ms on listing pages | `/`, `/shop`, `/categories/*` | Next chunks + hydration; bootup time dominated by page + `1255-*.js` |
| JS-03 | Client product card carousel | Shop, category, occasion, home grids | `components/product/product-card-media.tsx` (`"use client"`) |
| JS-04 | Client product gallery shell | Product detail | `components/product/product-detail-gallery.tsx` |
| JS-05 | Header client islands on every page | All | `header-actions.tsx`, `mobile-nav.tsx`, `scroll-to-top.tsx` |

### CSS

| ID | Finding | Affected pages | Notes |
|---|---|---|---|
| CSS-01 | Render-blocking stylesheet ~150 ms | Some mobile runs (category, occasion, product) | Next.js compiled CSS; expect modest gain from critical CSS strategy |
| CSS-02 | Tailwind + component CSS via global bundle | All | `app/globals.css` |

### Fonts

| ID | Finding | Notes |
|---|---|---|
| FONT-01 | **No issue detected** | Inter + Playfair via `next/font/google`, `display: swap` — Lighthouse pass |

### External services

| ID | Service | Impact | Pages |
|---|---|---|---|
| EXT-01 | Supabase Storage (product images) | LCP resource load on product detail | `/products/[slug]` |
| EXT-02 | Vercel `_next/image` optimizer | All images; necessary but adds redirect chain | All |
| EXT-03 | Econt API | Checkout only — **not in baseline page set** | `/checkout` |
| EXT-04 | Analytics | No GTM/Pixel loaded (per `site-content` cookies policy) | — |

---

## Phase 4 implementation plan (prioritized)

Ordered by **expected mobile CWV impact**, then **implementation risk**.

| Priority | ID | Action | Expected effect | Risk | Effort | Related audit |
|---:|---|---|---|---|---|---|
| 1 | IMG-01/02 | **Single LCP `priority` candidate per template** — remove `priority` from header logo on pages with hero, or demote hero when logo wins; ensure one `fetchpriority="high"` on true LCP | High mobile LCP (−0.5–1.5 s est.) | Low | S | LOW-03 |
| 2 | JS-01 | **Scope `CartProvider`** to cart/shop/product/checkout routes instead of root layout | High mobile TBT / INP on content pages | Medium | L | LOW-06 |
| 3 | JS-03 | **Split product card media** — SSR first image + link; hydrate carousel only on interaction | Medium TBT on listing pages; less hydration | Medium | M | LOW-02 |
| 4 | JS-04 | **SSR-first product gallery** — server-render first image; client enhancement for thumbnails | Medium product LCP render delay | Medium | M | — |
| 5 | IMG-04 | **Product hero image strategy** — preload LCP image URL in `generateMetadata` / `<link rel="preload">`; verify `sizes` for mobile | Medium product LCP | Low | S | — |
| 6 | IMG-05 | **Convert category PNG heroes to WebP/AVIF** where missing | Low–medium LCP on category pages | Low | S | — |
| 7 | CSS-01 | Audit render-blocking CSS; defer non-critical if measurable | Low mobile FCP | Low | S | — |
| 8 | CLS-D | **Fix desktop CLS** on category (0.104) and product (0.057) — explicit dimensions, reserve hero height | CLS field data | Low | S | — |
| 9 | — | **Bundle analysis** (`@next/bundle-analyzer`) after CartProvider scope change | Validates JS-01/02 | Low | S | — |
| 10 | — | **Field CWV** via Search Console / CrUX after deploy | Validation | — | — | — |

### Recommended Phase 4 execution order

```text
Phase 4a (quick wins)     → IMG-01/02, IMG-05, CLS-D
Phase 4b (architecture)   → JS-01 CartProvider scope
Phase 4c (components)     → JS-03 product card, JS-04 gallery
Phase 4d (product LCP)    → IMG-04 preload + Supabase path review
Phase 4e (validation)     → Re-run Lighthouse matrix + CrUX
```

### Success targets (mobile lab, same URLs)

| Metric | Current baseline | Phase 4 target |
|---|---:|---:|
| Performance score | 70–72 (listings) | ≥ 85 |
| LCP | 2.9–3.3 s | ≤ 2.5 s |
| TBT | 890–1,080 ms (listings) | ≤ 300 ms |
| CLS | ≤ 0.031 mobile | maintain ≤ 0.1 |

---

## Validation commands (Phase 4 regression)

```bash
cd D:\Cursor\src

# Repeat baseline capture (example — homepage mobile)
npx lighthouse@12.6.1 "https://vemidi-store.vercel.app/" \
  --output=json --output-path=./tmp-lh-home-mobile.json \
  --form-factor=mobile --screenEmulation.mobile=true \
  --only-categories=performance --chrome-flags="--headless=new"

npm run typecheck
npm test
npm run build
```

**Field validation (post-deploy):** Google Search Console → Core Web Vitals; PageSpeed Insights field data for `/`, `/shop`, `/categories/kutii`, `/products/plik-za-pari`.

---

## Relationship to Technical SEO audit

| Audit ID | Phase 4 baseline evidence |
|---|---|
| LOW-02 | JS-03 — `product-card-media.tsx` client carousel on all grids |
| LOW-03 | IMG-01/02 — header + hero dual `priority` |
| LOW-06 | JS-01 — global `CartProvider` correlates with high mobile TBT |
| §13 CWV | Quantified LCP/CLS/TBT gap mobile vs desktop |

---

*Baseline captured 2026-06-14. No code changes in this document. Awaiting Phase 4 implementation approval.*

---

## Phase 4a implementation — awaiting measurement

**Status:** Code complete locally (not committed). Baseline commit: `adac58f`.
**Scope:** Low-risk Core Web Vitals quick wins — IMG-01/02 and IMG-05 only. No CartProvider, product-card, admin, or hero layout changes.

### Changes made

| Area | Action | Files |
|---|---|---|
| **IMG-01/02** | Removed `priority` from header logo | `components/layout/header.tsx` |
| **IMG-01/02** | Removed `priority` from about page inline image (text `PageHero` only) | `app/about/page.tsx` |
| **IMG-01/02** | Kept `priority` on true LCP images: `HomeHero`, `VisualPageHero`, first gallery image, thank-you hero | `home-hero.tsx`, `visual-page-hero.tsx`, `product-detail-gallery.tsx`, `thank-you-content.tsx` |
| **IMG-05** | Converted mapped product-category PNG heroes to WebP (q=85); originals retained | `public/assets/categories/product/*.webp`, `public/assets/moss.webp` |
| **IMG-05** | Updated slug → file mapping for PNG → WebP | `lib/category-images.ts` |
| **Tests** | Source-level priority tests; category WebP mapping tests | `tests/performance-priority.test.ts`, `tests/category-images.test.ts` |

Hero container dimensions and `sizes` attributes were **not changed** from the pre-4a baseline layout.

### LCP priority candidate per template (post-4a)

| Template | LCP priority image | Notes |
|---|---|---|
| `/` | `home-hero.webp` via `HomeHero` | Header logo lazy |
| `/shop` | `products.png` via `VisualPageHero` | Header logo lazy |
| `/categories/[slug]` | Category hero via `VisualPageHero` + `getCategoryImageSrc()` | e.g. `kutii.webp` |
| `/occasions/[slug]` | Occasion hero via `VisualPageHero` | e.g. `occasion-svatba.webp` |
| `/products/[slug]` | First gallery image via `ProductDetailGallery` (`priority={safeIndex === 0}`) | Supabase CDN URL |
| `/about` | None (text `PageHero`; about image lazy) | No competing priority |
| `/thank-you` | `thank-you.webp` | Sole priority on page |

### WebP conversion summary (mapped PNG → WebP)

| File | Original | WebP |
|---|---:|---:|
| `kutii` | 2.0 MB | 124 KB |
| `gips` | 601 KB | 24 KB |
| `medali` | 2.1 MB | 136 KB |
| `plik-za-pari` | 2.7 MB | 294 KB |
| `sapuneni-rozi` | 1.9 MB | 131 KB |
| `zakachalki-kluch` | 2.1 MB | 128 KB |
| `moss` | 1.7 MB | 124 KB |

JPG-mapped categories (`bijuta`, `gosti`, `ramki-pana`, `semejni`) unchanged.

### Desktop CLS — not addressed in 4a

Baseline desktop CLS remains elevated on some templates (category **0.104**, product **0.057**). Phase 4a did **not** change hero layout or claim a CLS fix. Desktop CLS requires a fresh Lighthouse run and trace analysis after deploy before any further layout intervention.

### Validation (local, pre-commit)

| Check | Result |
|---|---|
| `git diff --check` | ✅ Pass |
| `npm run typecheck` | ✅ Pass |
| `npm run lint` | ✅ Pass (2 pre-existing warnings) |
| `npm test` | ✅ Pass |
| `npm run build` | ✅ Pass |
| Browser smoke (375 / 768 / 1440 px) | See implementation report |

**Baseline scorecard above is unchanged** — re-run Lighthouse matrix after deploy to measure impact.

### Remaining risks (deferred to Phase 4b+)

| ID | Risk | Phase |
|---|---|---|
| JS-01 | Global `CartProvider` — mobile TBT 890–1,080 ms on listings | 4b |
| JS-03 | Client product card carousel hydration | 4c |
| JS-04 | Client product gallery shell — product LCP render delay | 4c |
| IMG-04 | Supabase remote URL on product LCP critical path | 4d |
| CSS-01 | Render-blocking CSS ~150 ms on some mobile templates | Follow-up if needed |
| CLS-D | Desktop CLS 0.10+ on category/product — awaiting Lighthouse trace | Post-4a measurement |

---

## Phase 4a post-deploy measurement

**Measurement date:** 2026-06-15 (Europe/Sofia, local capture window ~01:22–01:45 EEST)
**Production URL:** https://vemidi-store.vercel.app
**Production commit:** `9155baa` (GitHub Production deployment confirmed)
**Baseline reference:** `adac58f` scorecard (single-run capture)
**Post-deploy method:** Lighthouse CLI **12.6.1**, same flags as baseline; **3 sequential runs** per URL × form factor; **median** used for comparison
**Raw artifacts:** `tmp-lh-4a-*.json` (local, gitignored)

### Methodology note

The original scorecard above remains a **single-run baseline**. Post-deploy values are **medians of 3 runs**. This comparison (**single-run baseline vs median post-deploy**) does **not** establish causality — Phase 4a changes may correlate with observed deltas but cannot be attributed with certainty from lab data alone. Differences under **5% score** or **0.2 s LCP** should be treated as possible lab noise unless supported by LCP phase breakdown or network waterfall.

---

### Production deployment verification

| Check | Result |
|---|---|
| GitHub Production deployment SHA | `9155baa` ✅ |
| `/categories/kutii` serves `kutii.webp` (not `.png`) | ✅ |
| Header logo `loading="lazy"` in HTML | ✅ |
| Broken image requests (404) across 30 runs | **0** ✅ |

---

### Summary scorecard — baseline vs Phase 4a median

| Page | Mobile Perf (base → 4a) | Δ | Mobile LCP | Δ | Desktop Perf | Δ | Desktop LCP | Δ | Mobile TBT | Δ | Desktop CLS | Δ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `/` | 72 → **89** | +24% | 2.9 → **3.2 s** | +0.3 s ⚠️ noise | 98 → **99** | +1% | 0.7 → **0.6 s** | −0.1 s | 1,080 → **82 ms** | −92% | 0.063 → **0.063** | 0 |
| `/shop` | 70 → **82** | +17% | 3.2 → **3.1 s** | −0.1 s ⚠️ noise | 99 → **74** | −25% ‡ | 0.7 → **0.8 s** | +0.1 s ⚠️ noise | 1,070 → **504 ms** | −53% | 0.057 → **0.771** | ‡ anomalous |
| `/categories/kutii` | 72 → **81** | +13% | 3.3 → **2.8 s** | −0.5 s | 97 → **97** | 0% | 0.8 → **0.7 s** | −0.1 s | 890 → **609 ms** | −32% | 0.104 → **0.104** | 0 |
| `/occasions/svatba` | 85 → **74** | −13% † | 2.9 → **3.0 s** | +0.1 s ⚠️ noise | 99 → **96** | −3% ⚠️ noise | 0.8 → **0.7 s** | −0.1 s | 410 → **861 ms** | +110% † | 0.024 → **0.094** | +0.07 |
| `/products/plik-za-pari` | 90 → **88** | −2% ⚠️ noise | 3.0 → **2.9 s** | −0.1 s ⚠️ noise | 99 → **99** | 0% | 0.7 → **0.6 s** | −0.1 s | 130 → **217 ms** | +67% † | 0.057 → **0.057** | 0 |

† High run-to-run variance (see anomalies). ‡ Desktop `/shop` runs 2–3 had CLS **0.771** (layout-shift outlier); run 1 CLS **0.057** matched baseline.

---

### Detailed metrics — Phase 4a medians

| Page | Form | Perf | LCP | CLS | TBT | FCP | Speed Index | TTFB | LCP load delay | LCP load dur. | LCP render delay |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `/` | Mobile | 89 | 3.2 s | 0.000 | 82 ms | 1.8 s | 4.4 s | 147 ms | 658 ms | 55 ms | 1,701 ms |
| `/` | Desktop | 99 | 0.6 s | 0.063 | 74 ms | 0.3 s | 0.8 s | 136 ms | 650 ms | 56 ms | 400 ms |
| `/shop` | Mobile | 82 | 3.1 s | 0.031 | 504 ms | 1.1 s | 2.2 s | 40 ms | 643 ms | 54 ms | 1,201 ms |
| `/shop` | Desktop | 74 | 0.8 s | 0.771 ‡ | 111 ms | 0.4 s | 1.0 s | 40 ms | 552 ms | 58 ms | 1,100 ms |
| `/categories/kutii` | Mobile | 81 | 2.8 s | 0.031 | 609 ms | 1.0 s | 2.0 s | 137 ms | 505 ms | 53 ms | 527 ms |
| `/categories/kutii` | Desktop | 97 | 0.7 s | **0.104** | 63 ms | 0.3 s | 0.9 s | 138 ms | 531 ms | 65 ms | 595 ms |
| `/occasions/svatba` | Mobile | 74 | 3.0 s | 0.031 | 861 ms | 1.0 s | 2.5 s | 40 ms | 541 ms | 55 ms | 1,200 ms |
| `/occasions/svatba` | Desktop | 96 | 0.7 s | 0.094 | 84 ms | 0.3 s | 1.1 s | 44 ms | 507 ms | 56 ms | 500 ms |
| `/products/plik-za-pari` | Mobile | 88 | 2.9 s | 0.000 | 217 ms | 1.8 s | 4.6 s | 40 ms | 984 ms | 185 ms | 1,145 ms |
| `/products/plik-za-pari` | Desktop | 99 | 0.6 s | **0.057** | 11 ms | 0.3 s | 1.0 s | 40 ms | 1,168 ms | 62 ms | 400 ms |

---

### LCP resource verification (representative run with hero as LCP)

| Page | LCP element | LCP resource URL | Transfer size | `fetchpriority="high"` in DOM | Network priority | Eager/high images |
|---|---|---|---|---|---|---|
| `/` mobile | Hero `<img>` home-hero | `/_next/image?…home-hero.webp` | ~57 KB | Not in DOM snippet | **High** | 1 |
| `/shop` mobile | Hero `<img>` products.png | `/_next/image?…products.png` | ~49 KB | Not in DOM snippet | **High** | 1 |
| `/categories/kutii` mobile | Hero `<img>` kutii | `/_next/image?…kutii.webp` | **~31 KB** | Not in DOM snippet | **High** | 1 |
| `/categories/kutii` desktop | Hero `<img>` kutii | `/_next/image?…kutii.webp` | **~36 KB** | Not in DOM snippet | **High** | 1 |
| `/occasions/svatba` mobile | Hero `<img>` svatba | `/_next/image?…occasion-svatba.webp` | ~14 KB | Not in DOM snippet | **High** | 1–3 |
| `/products/plik-za-pari` desktop | Gallery `<img>` | Supabase product image via `_next/image` | ~49 KB | Not in DOM snippet | **High** | 1 |

Header logo: **`loading="lazy"`** in production HTML; **not** high network priority in runs where hero was LCP. `prioritize-lcp-image` audit **passes** (score 1) on homepage mobile run 1 vs baseline failure on fetchpriority detection.

**WebP transfer (IMG-05):** Category hero `kutii.webp` optimized transfer **~31–36 KB** via `_next/image` (q=75). Source PNG is **2.0 MB** on disk; WebP source file **127 KB**. No `kutii.png` requests observed in category runs.

---

### LCP phase comparison (where hero was stable LCP)

| Page | Form | Metric | Baseline | Phase 4a median | Δ | Assessment |
|---|---|---|---:|---:|---:|---|
| `/` | Mobile | Resource load delay | 1,089 ms | 658 ms | **−431 ms (−40%)** | Improved — supports IMG-02 |
| `/` | Mobile | Resource load duration | 74 ms | 55 ms | −19 ms | Minor |
| `/` | Mobile | Element render delay | 747 ms | 1,701 ms | +954 ms | Worse — lab variance / different main-thread shape; TBT median −998 ms |
| `/categories/kutii` | Mobile | LCP | 3.3 s | 2.8 s | **−0.5 s** | Meaningful; WebP + priority cleanup likely contributors |
| `/categories/kutii` | Desktop | CLS | 0.104 | 0.104 | 0 | **Unchanged** — CLS-D not addressed |
| `/products/plik-za-pari` | Desktop | CLS | 0.057 | 0.057 | 0 | **Unchanged** |

---

### Run anomalies (not excluded; noted for interpretation)

| Run | Observation |
|---|---|
| `/shop` mobile run 3 | Perf **65**, TBT **1,303 ms** — main-thread outlier; median TBT still −53% vs baseline |
| `/shop` desktop runs 2–3 | CLS **0.771**, Perf **74** — severe layout-shift outlier; run 1 CLS **0.057** matches baseline |
| `/occasions/svatba` mobile run 1 | Perf **67**, TBT **1,089 ms** — pulls median TBT above baseline |
| `/products/plik-za-pari` mobile run 1 | TBT **1,688 ms** outlier; runs 2–3 TBT **46–217 ms** |

---

### Hypothesis verdicts

| ID | Hypothesis | Verdict | Evidence |
|---|---|---|---|
| **IMG-01** | Dual `priority` (header + hero) removed | **Confirmed** | Logo lazy in HTML; hero receives sole high network priority when hero is LCP; 0 broken images |
| **IMG-02** | LCP discovery / load delay improved | **Partially confirmed** | Homepage mobile load delay −40%; category mobile LCP −0.5 s; `prioritize-lcp-image` passes. Not uniform across all URLs; render-delay and multi-run variance limit causal claims |
| **IMG-05** | WebP reduces category hero transfer | **Confirmed** | `kutii.webp` served in production; ~31–36 KB transfer vs 2.0 MB PNG source; no `.png` request |
| **CLS-D** | Desktop CLS fixed | **Not confirmed** | Category desktop CLS **0.104** unchanged; product desktop **0.057** unchanged; `/shop` desktop polluted by outlier runs — needs trace analysis |
| **Phase 4b** | CartProvider impact on mobile TBT | **Investigate first** | Mobile TBT medians still **504–861 ms** on listing templates (`/shop`, `/occasions`); homepage TBT improved dramatically but listing pages remain above ≤300 ms target; lab INP not measured — TBT used as proxy only. **Next:** bundle/trace analysis of `CartProvider`; scoping only if its contribution is proven |

### Visual / functional checks (production)

No visual regression reported during post-deploy browser verification. Hero proportions unchanged (Phase 4a did not modify hero layout). WebP heroes render correctly with `object-cover`.

**Next step:** Optional Lighthouse trace on `/categories/kutii` and `/shop` desktop for CLS outliers before any layout intervention. For Phase 4b: **bundle/trace analysis on `CartProvider` first**; route scoping only if its contribution to mobile TBT is proven.
