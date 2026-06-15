# Performance Phase 4c — A1 Static Listing Media (Rejected Experiment)

**Project:** `D:\Cursor\src`  
**Experiment date:** 2026-06-15  
**Phase 4b baseline (production medians):** `ce761f8`  
**Status:** **Rejected for production** — experimental application code **not committed**; production remains **A0 carousel** (`ProductCardMedia`).

---

## Decision

**A1 (static server-rendered first image on listing cards) is rejected.**

| Criterion | Result |
|---|---|
| First Load JS reduction | **−2 kB** on listing routes (113 → 111 kB) — real but small |
| TBT improvement | **Inconsistent** in local A0↔A1 comparison; best −52 ms on `/categories/kutii`; **does not meet ≥100 ms gate** |
| Carousel UX | **Lost** on all grids switched to A1 (swipe, arrows, dots) |
| Production promotion | **No** — cost/benefit does not justify permanent static cards |

**Production behavior:** unchanged **A0** — client `ProductCardMedia` carousel on all `ProductCard` instances including listing grids.

---

## What was tested (local prototype only)

Listing grids temporarily used **`ProductCardCatalog`** → **`ProductCardMediaStatic`** (server-rendered first image, no client hydration).  
**`ProductCardMedia`** was preserved in the codebase for comparison but listing routes were wired through a separate entry point.

**Prototype files (removed after experiment — not in repo):**

| File | Role |
|---|---|
| `lib/performance-phase-4c.ts` | Boolean flag (not a runtime toggle alone — see below) |
| `components/product/product-card-media-static.tsx` | Server static first image |
| `components/product/product-card-shell.tsx` | Shared card layout |
| `components/product/product-card-catalog.tsx` | A1 catalog card |
| `components/product/listing-product-card.tsx` | A1/A0 re-export switch |
| `components/product/listing-product-card-a1.tsx` | A1 entry |
| `components/product/listing-product-card-a0.tsx` | A0 entry |

**Also touched in prototype (reverted):** `product-card.tsx`, `app/shop/page.tsx`, `app/categories/[slug]/page.tsx`, `app/occasions/[slug]/page.tsx`, `app/page.tsx`, `app/products/[slug]/page.tsx`.

**Unchanged throughout:** `CartProvider`, checkout, cart, product detail gallery, `product-card-media.tsx`.

---

## Toggle limitations

The experiment was **not** a standalone runtime feature flag:

1. **`USE_PHASE_4C_STATIC_LISTING_MEDIA`** in `lib/performance-phase-4c.ts` documented intent but did not alone control behavior.
2. **Variant selection required a hardcoded re-export** in `listing-product-card.tsx` (`a1` vs `a0`) so webpack would tree-shake the unused carousel chunk — a runtime `if` inside one module kept **both** variants in the listing bundle.
3. Switching variants therefore needed **rebuild + re-export edit**, not a deploy-time env toggle.

---

## Scope beyond Lighthouse comparison

Lighthouse mobile runs compared only three listing URLs:

- `/shop`
- `/categories/kutii`
- `/occasions/svatba`

The prototype also switched **homepage** product grid (`app/page.tsx`) and **related products** on product detail (`app/products/[slug]/page.tsx`) to A1. Those surfaces were **not** included in the 3×3 Lighthouse matrix — any UX or performance effect there was **unmeasured**.

---

## Bundle impact (local production build, A1)

| Route | A0 (Phase 4b) | A1 prototype | Δ First Load JS |
|---|---:|---:|---:|
| `/shop` | 113 kB | 111 kB | **−2 kB** |
| `/categories/[slug]` | 113 kB | 111 kB | **−2 kB** |
| `/occasions/[slug]` | 113 kB | 111 kB | **−2 kB** |

Listing page client chunk dropped from ~5.8 KB (carousel + `useState`) to ~183 B when A1 re-export was active. **Reported measurable bundle win at route level: 2 kB First Load JS** (shared framework chunks unchanged).

---

## Lighthouse mobile (localhost:3000, Lighthouse 12.6.1, 3-run medians)

**Method:** `npm run build && npm start`; `--form-factor=mobile`. Valid bundles only (after re-export fix).  
Absolute localhost TBT ≠ Vercel production; use **local A0↔A1 delta** for causality.

### Controlled local comparison

| Page | A0 TBT | A1 TBT | Local Δ | A0 Perf | A1 Perf | A0 LCP | A1 LCP | CLS |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| `/shop` | 137 ms | 158 ms | +21 ms ⚠️ noise | 91 | 89 | 3.2 s | 3.3 s | 0.031 |
| `/categories/kutii` | 92 ms | 40 ms | **−52 ms** | 93 | 94 | 3.0 s | 3.0 s | 0.031 |
| `/occasions/svatba` | 23 ms | 91 ms | +68 ms ⚠️ noise | 94 | 93 | 3.0 s | 3.1 s | 0.031 |

**Gate (Phase 4b):** ≥100 ms median TBT improvement → **not met** (best −52 ms; two of three URLs worse or within noise).

### Phase 4b production reference (not re-run in 4c)

| Page | Prod TBT (4b) |
|---|---:|
| `/shop` | 504 ms |
| `/categories/kutii` | 609 ms |
| `/occasions/svatba` | 861 ms |

Production A/B was **not** performed; localhost did not reproduce production-scale TBT.

---

## UX regression (A1 vs A0)

| Aspect | A0 (production) | A1 (rejected) |
|---|---|---|
| Multi-image carousel on listings | Swipe, arrows, dots | **Removed** |
| First image + link + badges | Yes | Yes |
| Keyboard carousel on card | Dots/buttons | **Removed** |

No horizontal overflow or console errors in spot-checks on the three listing URLs at mobile/desktop widths.

---

## Why A2 was not pursued in this phase

**A2 (interaction-gated carousel)** remains a **future option** but requires a **separate architectural prototype** — not implemented here.

| Concern | Implication |
|---|---|
| **Per-card client islands** | Interaction detection (focus, pointer, visibility) likely reintroduces a **client boundary per grid cell** — same N× hydration scaling as A0 unless design is fundamentally different (e.g. single shared carousel controller). |
| **Mobile hover** | Hover is **insufficient** on mobile; cannot gate hydration on hover alone. |
| **Mobile swipe** | Swipe **cannot be detected without JavaScript already loaded** on the card — gating on swipe implies client code present before or during first interaction, not pure SSR deferral. |
| **Measurement** | Would need its own controlled experiment and production Lighthouse matrix before any promotion. |

**CartProvider:** no change (per Phase 4b decision).

---

## Outcome summary

| Finding | Detail |
|---|---|
| Hydration/bundle | Listing routes can shed ~2 kB First Load JS and drop carousel from page chunk when statically rendered |
| TBT | Improvement **inconsistent**; **below 100 ms threshold**; inconclusive for production claim |
| UX | **Carousel lost** on listing/home/related grids in prototype |
| Verdict | **Reject A1**; keep **A0 carousel** in production codebase |

---

## Validation (post-cleanup, A0 restored)

| Check | Result |
|---|---|
| `git diff --check` | Pass |
| `npm run typecheck` | Pass |
| `npm run lint` | Pass |
| `npm test` | Pass |
| `npm run build` | Pass |

---

*Local artifacts: `tmp-lh-4c-a0-*`, `tmp-lh-4c-a1-*`, `tmp-build-4c-a1.log` — gitignored, not committed.*
