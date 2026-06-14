# Performance Phase 4b — JavaScript / Hydration / Long-Task Diagnosis

**Project:** `D:\Cursor\src`  
**Diagnosis date:** 2026-06-15 (Europe/Sofia)  
**Production:** https://vemidi-store.vercel.app  
**Phase 4a code:** `9155baa` · **Phase 4a report:** `3a47e93`  
**Branch:** `main`  
**Scope:** Diagnostic only — no application code changes, no deploy

---

## Methodology

| Source | Purpose |
|---|---|
| Static import graph | Client boundaries, `useCart` consumers, server→client re-exports |
| `npm run build` route table | First Load JS / route JS (Next.js 15.5.19) |
| Chunk content scan (`.next/static/chunks`) | Raw/gzip/brotli sizes; string markers for CartProvider / ProductCardMedia |
| Existing `tmp-lh-4a-*` reports | Mobile TBT, bootup-time, long-tasks, main-thread breakdown (3-run medians) |
| New `tmp-lh-4b-about-mobile-run{1-3}.json` | Light control route without product grid |
| Controlled build experiment | Temporary removal of `<CartProvider>` wrapper in `app/layout.tsx`; restored immediately |

**Interpretation rules (from Phase 4a):** Lab TBT is an INP proxy only. Do not attribute causality from correlational route comparisons alone. Threshold for architectural change: **≥10% route JS** or **≥100 ms median TBT** improvement with reproducible evidence.

**Limits of this diagnosis:**

- **No controlled experiment** was run with `ProductCardMedia` removed or replaced — only correlational route comparisons and a CartProvider wrapper removal build test.
- **Shared Next.js chunk `1255-*.js`** and **page DOM size** (large product grids) may also contribute to main-thread work independently of product-card hydration.
- **Phase 4c** should begin with a **temporary controlled prototype** (not production refactor) before committing to one pattern.
- **`CartProvider` must not be changed** until a follow-up measurement shows **proven, repeatable** benefit above the decision thresholds.

---

## Executive conclusion

| Question | Answer |
|---|---|
| Leading candidate for listing-page mobile TBT? | **`ProductCardMedia` repeated hydration** — supported by bundle, hydration boundary, and TBT data; **not causally proven** |
| Other contributing factors | **Next.js shared chunk `1255-*.js`**, large DOM / Style & Layout on grids |
| Is CartProvider scoping justified now? | **No** — insufficient measured benefit vs regression risk |
| Recommended next phase | **Phase 4c:** controlled prototype comparing carousel variants (see §10) |
| CartProvider action | **Do not change** until documented measurable benefit; optional **lightweight badge store (variant B)** only after 4c measurement |

**Key evidence:**

- `/about` mobile TBT median **179 ms** vs `/shop` **504 ms** — both share global `CartProvider`; difference aligns with product grid absence vs presence.
- Cart chunk `5711-*.js` is **~18 KB raw / ~6.7 KB transfer**; Lighthouse reports **~13 KB unused (75%)** on `/shop` mobile — badge-only usage on listings.
- Top bootup scripts on heavy routes are **`1255-*.js`** (625–1,532 ms total CPU in traces) and **document HTML**, not `5711-*.js`.
- Removing `<CartProvider>` wrapper alone changed **First Load JS by 0 KB** (build experiment) — header still imports `useCart` → full cart module graph remains.

---

## 1. Client-boundary map

### Global (every public route via `app/layout.tsx`)

```
RootLayout (Server)
└── CartProvider (Client) ← global boundary
    └── SiteShell (Server)
        ├── Header (Server, Suspense)
        │   ├── HeaderActions (Client) → useCart().itemCount
        │   └── MobileNav (Client) → NavCartLink → useCart().itemCount
        ├── main → {children}
        ├── ScrollToTop (Client)
        └── Footer (Server)
```

CartProvider also mounts **CartAddedToast** (client) globally when add-to-cart fires.

### Per-route page boundaries

| Route | Page (Server/Client) | Route-specific client components | Repeated hydration |
|---|---|---|---|
| `/` | Server | `HomeHero`, story sections (Server); **`ProductCard` → `ProductCardMedia` × ~6**; `NewsletterForm` (client, home grid) | 6× ProductCardMedia |
| `/shop` | Server | **`ProductCard` → `ProductCardMedia` × N** (full catalog grid, `variant="catalog"`) | N× (typically 20–40+) |
| `/categories/kutii` | Server | Same shop page chunk; **`ProductCardMedia` × N** (+ optional subcategory cards Server-only) | N× |
| `/occasions/svatba` | Server | **`ProductCardMedia` × N** | N× |
| `/products/plik-za-pari` | Server | **`ProductDetailGallery`** (client); **`ProductDetailAddToCart`** → `useCart().addProduct`; related `ProductCard` grid | 1 gallery + M cards |
| `/blog` | Server | **`NewsletterForm`** (client); no ProductCard | 1× newsletter |
| `/about` | Server | **None** (PageHero + static Image — all Server) | — |
| `/cart` | Server | **`CartPanel`** → full `useCart` | 1× cart UI |
| `/checkout` | Server | **`CheckoutPanel`** → lines, subtotal, clear | 1× checkout UI |

**Server → client expansion pattern:** `ProductCard` is a **Server Component** that imports **`ProductCardMedia` (Client)**. Each grid cell creates an independent client island — classic multiplication of hydration cost on listing pages.

---

## 2. CartProvider dependency audit

### Direct `useCart` consumers

| Component | Route exposure | API used | Needs full provider? |
|---|---|---|---|
| `HeaderActions` | Global | `itemCount` | Badge only |
| `NavCartLink` | Global (mobile menu) | `itemCount` | Badge only |
| `CartPanel` | `/cart` | lines, setQuantity, removeLine, subtotal | **Full** |
| `CheckoutPanel` | `/checkout` | lines, subtotal, clear | **Full** |
| `ProductDetailAddToCart` | `/products/[slug]` | `addProduct` | **Full actions** |
| `CampaignCheckoutBridge` | `/campaign-checkout` | `addProduct` | **Full actions** |

### CartProvider module graph (chunk `5711-*.js`)

Includes not only React state but bundled helpers:

- `cart-storage`, `cart-types`, `localStorage` sync
- `product-options` validation, `product-option-pricing`, `product-personalization`
- `campaign-attribution`, `CartAddedToast`
- `makeCartLineId`, quantity limits

**Implication:** Even a “badge-only” header still pulls the **full module** today via `import { useCart } from cart-provider`.

### Persistence / storage touchpoints

| Mechanism | Location | Runs on |
|---|---|---|
| `localStorage` read/write | `CartProvider` mount + line changes | Every page after hydration |
| Legacy cart migration | `readStoredLines()` | First mount |
| `sessionStorage` campaign key | `addProduct` | Product/campaign flows only |

### Route need summary

| Need level | Routes |
|---|---|
| **No cart interaction** | `/about`, `/blog` (browse only), static content |
| **Badge only** | `/`, `/shop`, `/categories/*`, `/occasions/*`, `/blog` (header count) |
| **Full cart** | `/cart`, `/checkout` |
| **Add to cart** | `/products/*`, `/campaign-checkout` |

### Split feasibility (dependency-traced, not proposed yet)

| Approach | Safe? | Blocker |
|---|---|---|
| **B: Lightweight badge + full actions** | Possible | Requires splitting `useCart` import path so header does not import full `addProduct` graph |
| **C: Route-scoped layouts** | Risky | Header is global; badge must work on all routes; checkout funnel must share state |
| **Remove root wrapper only** | **Ineffective** | Build experiment: **0 KB** First Load JS delta |

---

## 3. Production bundle analysis

### Route table (Next.js build, 2026-06-15)

| Route | Route JS | First Load JS | Δ vs `/about` |
|---|---:|---:|---:|
| `/about` | 183 B | **111 kB** | — |
| `/blog` | 2.13 kB | 113 kB | +2 kB |
| `/shop` | 2.45 kB | 113 kB | +2 kB |
| `/categories/[slug]` | 2.45 kB | 113 kB | +2 kB |
| `/occasions/[slug]` | 2.45 kB | 113 kB | +2 kB |
| `/` | 4.02 kB | 115 kB | +4 kB |
| `/products/[slug]` | 7.45 kB | 125 kB | +14 kB |
| `/cart` | 2.8 kB | 120 kB | +9 kB |
| `/checkout` | 13.4 kB | 131 kB | +20 kB |

**Shared by all:** 102 kB (`1255-*.js` 46.2 kB + `4bd1b696-*.js` 54.2 kB + ~2 kB)

### Identified client chunks (content scan)

| Chunk | Raw | Gzip | Markers |
|---|---:|---:|---|
| `1255-5c680abb9db89955.js` | 173 KB | 46 KB | Next/shared framework (no cart strings) |
| `4bd1b696-f785427dddbba9fb.js` | 173 KB | 54 KB | React DOM / Next runtime |
| **`5711-7ed1111f812cf8ee.js`** | **18 KB** | **6.3 KB** | **CartProvider**, cart-storage, options, personalization |
| `app/layout-*.js` | 8.9 KB | 3.1 KB | HeaderActions, MobileNav, ScrollToTop |
| `app/shop/page-*.js` (shared with category/occasion) | 5.8 KB | 2.5 KB | **ProductCardMedia** |
| `app/page-*.js` (home) | 11 KB | 4.0 KB | ProductCardMedia |
| `app/products/[slug]/page-*.js` | 24 KB | 7.5 KB | ProductCardMedia + gallery/add-to-cart imports |

**CartProvider vs ProductCardMedia:** Listing routes share one **5.8 KB** page chunk (ProductCardMedia) but pay hydration **per card instance**. Cart module is **~6.3 KB gzip once** but includes **~75% unused bytes** on shop (Lighthouse unused-javascript).

### Controlled experiment: remove `<CartProvider>` wrapper

| Metric | With provider | Without wrapper | Δ |
|---|---:|---:|---:|
| `/about` First Load JS | 111 kB | 111 kB | **0** |
| `/shop` First Load JS | 113 kB | 113 kB | **0** |
| Shared JS | 102 kB | 102 kB | **0** |

Temporary patch reverted; `git diff` empty after restore.

---

## 4. Lighthouse trace / long-task analysis (mobile)

### Median metrics (3 runs unless noted)

| Route | TBT | Long tasks ≥50 ms | Bootup total | Script eval (sample) | Style & layout (sample) |
|---|---:|---:|---:|---:|---:|
| `/` (control w/ 6 cards) | **82 ms** | 4 | 1,436 ms | 483 ms | 579 ms |
| `/about` (light control) | **179 ms** | 5 | — | — | — |
| `/shop` | **504 ms** | 6 | 2,545 ms | 1,005 ms | 870 ms |
| `/categories/kutii` | **609 ms** | 6 | 2,120 ms | 924 ms | 701 ms |
| `/occasions/svatba` | **861 ms** | 7 | 2,955 ms | 1,247 ms | 1,022 ms |

**Correlational gap:** `/shop` vs `/about` TBT Δ ≈ **325 ms** (>100 ms) with **same global CartProvider** → aligns with product grid / main-thread work, not cart wrapper alone.

### Top bootup scripts (representative `/shop` mobile run 2)

| Script | Total CPU | Scripting | Notes |
|---|---:|---:|---|
| Page HTML (`/shop`) | 1,195 ms | 73 ms | Large DOM + many hydrated islands |
| **`1255-622ea82dde4a9a8f.js`** | **625 ms** | **563 ms** | Next.js shared — dominant |
| `webpack-*.js` | 281 ms | 277 ms | Runtime bootstrap |
| `4bd1b696-*.js` | 123 ms | 58 ms | React runtime |
| **`5711-*.js`** | Not in top bootup | — | Loaded (6.7 KB transfer) but low exclusive CPU |

### Unused JavaScript (`/shop` mobile run 2, Lighthouse)

| Chunk | Resource bytes | Unused bytes | Unused % |
|---|---:|---:|---:|
| `1255-*.js` | 173,851 | 70,636 | 41% |
| `4bd1b696-*.js` | 173,020 | 44,950 | 26% |
| **`5711-*.js`** | **17,721** | **13,279** | **75%** |
| `shop/page-*.js` | 5,675 | 1,736 | 31% |

### Anomalies (retained from Phase 4a)

- `/shop` mobile run 3: TBT **1,303 ms**, 13 long tasks — outlier; median used for comparisons.
- `/occasions/svatba` mobile run 1: TBT **1,089 ms** — inflates median.

---

## 5. Evidence matrix: CartProvider as TBT cause

| Criterion | Threshold | Observed | Pass? |
|---|---|---|---|
| Route JS reduction from scoping | ≥10% | **0%** (wrapper removal experiment) | ❌ |
| Median TBT improvement | ≥100 ms sustained | Cannot isolate; `/about` still 179 ms with provider | ❌ |
| Chunk exclusive boot cost | Major long-task source | **`1255` >> `5711`** | ❌ |
| Unused cart code on listings | High waste | **75% unused** on shop | ⚠️ Supports split, not scoping alone |
| Natural control (no product grid) | TBT << listing | **179 vs 504 ms** | ✅ Grid correlates; cart global on both |

**Verdict:** **CartProvider route scoping is not justified** on current evidence. The provider’s module cost is real but **small relative to framework chunk cost and N× client islands on listing pages**. `ProductCardMedia` remains the **leading candidate** for Phase 4c investigation, not a proven sole cause.

---

## 6. ProductCardMedia assessment (Phase 4c candidate)

| Factor | Assessment |
|---|---|
| Status | **Leading candidate** — supported by bundle boundaries, per-card hydration, and TBT correlation with grid pages; **not isolated by controlled A/B** |
| Hydration multiplier | **N instances** per listing page (server component imports client child per card) |
| Client features | `useState` carousel, touch handlers, multiple `next/image` per card |
| Bundle | Shared 5.8 KB route chunk — cost scales with **instance count**, not file size alone |
| TBT correlation | Listing routes with large N show highest TBT / long-task counts |
| Confounders | Shared `1255-*.js` boot cost and larger DOM on listing pages also rise with grid size |
| Missing experiment | **No run** with ProductCardMedia removed or replaced on an otherwise identical page |

**Recommendation:** Prioritize **Phase 4c controlled prototype** before any CartProvider architecture change.

---

## 7. Regression risks (if CartProvider changed prematurely)

| Area | Risk |
|---|---|
| Header badge | Stale or zero count if badge store desyncs from localStorage |
| Add-to-cart toast | Global toast tied to provider; split requires explicit bridge |
| Checkout funnel | `/cart` → `/checkout` must share line state |
| Campaign handoff | `sessionStorage` attribution written in `addProduct` |
| Legacy cart migration | One-time `localStorage` migration in provider mount |

---

## 8. Solution options

### A. Keep global CartProvider; optimize product-card hydration first (recommended path)

- Run Phase 4c **temporary controlled prototype** (see §10) before production refactor.
- Re-measure listing TBT; optionally tree-shake unused exports from cart module later.
- **Expected effect:** Potentially largest TBT drop on `/shop`, `/categories/*`, `/occasions/*` — **to be confirmed by prototype**, not assumed.
- **Complexity:** Medium · **Regression risk:** Low–medium

### B. Split lightweight cart badge store + full actions provider

- New `cart-badge-store` (itemCount + storage subscribe) for header only.
- Full `CartProvider` on `/cart`, `/checkout`, `/products/*`, `/campaign-checkout` layouts.
- **Expected effect:** Recover ~75% unused cart JS on listings (~13 KB raw max; **likely <100 ms TBT**).
- **Complexity:** High · **Regression risk:** Medium (sync, migration, toast)

### C. Route-scoped layouts without badge split

- Move provider to nested layouts — **header still needs badge globally** → still imports full module unless B done first.
- **Expected effect:** Insufficient alone (proven 0 KB without import split).
- **Complexity:** Medium · **Regression risk:** Medium–high

---

## 9. Recommended decision

**Proceed to Phase 4c (ProductCardMedia controlled prototype)** as the next step — not full production refactor until variants are compared.

**Do not change `CartProvider`** until a follow-up phase documents **≥10% route JS** or **≥100 ms median TBT** improvement with reproducible evidence.

**Defer CartProvider scoping** until:

1. Phase 4c prototype is measured (3-run mobile Lighthouse on `/shop` + `/categories/kutii`), and  
2. If TBT still >300 ms, evaluate **variant B** (badge split) with A/B measurement targeting **≥100 ms** median improvement.

---

## 10. Implementation plan (documentation only — do not implement in 4b)

### Phase 4c (next) — controlled prototype first

Build a **temporary, local-only prototype** on a listing template (e.g. `/shop` or isolated branch) comparing **three variants** with otherwise identical pages:

| Variant | Description | Purpose |
|---|---|---|
| **A0 — Baseline** | Current client carousel (`ProductCardMedia` as shipped) | Reference TBT / long-task profile |
| **A1 — Static first image** | Server-rendered first image + link; **no client hydration** for card media | Isolate hydration cost of carousel |
| **A2 — Interaction-gated carousel** | Static first image until swipe/hover/focus; then hydrate carousel | Balance UX vs main-thread cost |

**Prototype workflow:**

1. Implement each variant behind a feature flag or temporary route — **not** production deploy.
2. Run **3 sequential mobile Lighthouse runs** per variant on the same URL(s).
3. Compare median TBT, long tasks ≥50 ms, and Script Evaluation — same methodology as Phase 4a/4b.
4. Only promote the winning variant to production if gain is **≥100 ms median TBT** or meets ≤300 ms target.
5. Discard prototype code if results are inconclusive (<100 ms delta — treat as measurement noise).

**Production refactor (after prototype):**

1. Keep `ProductCard` as server component; minimize client subtree.
2. Preserve carousel UX where A2 wins; fall back to A1 if UX testing rejects gated hydration.

### Phase 4b-follow-up (conditional — CartProvider unchanged until gates met)

1. Extract `lib/cart/badge-store.ts` (read-only count + storage event) **only if** Phase 4c does not reach TBT target.
2. Header imports badge store only; full provider on commerce layouts.
3. Integration tests for localStorage migration + checkout continuity.
4. Gate: ≥100 ms TBT improvement on listings **and** ≥10% reduction in unused cart JS on content routes.

---

## Artifacts (local, do not commit)

| Pattern | Contents |
|---|---|
| `tmp-lh-4a-*.json` | Phase 4a production Lighthouse (gitignored) |
| `tmp-lh-4b-about-mobile-run{1-3}.json` | Light control runs (gitignored via `tmp-lh-*`) |
| `tmp-lh-4b-trace-summary.json` | Parsed trace medians (gitignored) |
| `tmp-build-4b.log` | Build output log |

---

*Diagnostic complete. No application code committed. `CartProvider` unchanged. Awaiting review before Phase 4c controlled prototype.*
