# Product lifecycle SEO — implementation plan (proposal only)

From `docs/CONTENT-AND-STRUCTURED-DATA-AUDIT.md` §7 (H-05).
**No schema migration executed.** Current code cannot reliably distinguish temporarily sold out vs permanently discontinued.

---

## Current data model (storefront)

| Field | Source | Used for |
|---|---|---|
| `soldOut` | `products.is_sold_out` | UI badge, `orderable`, Offer `OutOfStock` |
| `fulfillmentType` | `made_to_order` \| `stocked` \| `unavailable` | Availability label, schema mapping |
| `orderable` | Derived | Add-to-cart eligibility |
| Slug history | `product_slug_history` | 308 redirects (replacement path C) |

**Not present:** `is_published`, `discontinued_at`, `lifecycle_status`, `replacement_product_id`.

All rows in `products` are loaded into the storefront catalog. Invalid slugs → HTTP 404 via `getStorefrontProductPage`.

---

## Implemented in code (this sprint)

| Policy row | Behavior |
|---|---|
| **A. Temporarily sold out** | HTTP 200, index default, sitemap included, Offer `OutOfStock` when `soldOut` |
| **B. Unavailable fulfillment** | HTTP 200, index default, sitemap included, Offer `OutOfStock` |
| **E. Invalid / missing product** | HTTP 404, `notFound()`, excluded from sitemap |

**Sitemap:** No product lifecycle filter yet — all catalog rows remain included until `lifecycle_status` / `is_published` exist (see migration below).

See `lib/seo/product-schema-availability.ts`, `app/sitemap.ts`, `app/products/[slug]/page.tsx`.

---

## Cannot implement without schema (rows C, D, F)

| Scenario | Needed signal | Proposed field(s) |
|---|---|---|
| **C. Discontinued with replacement** | Target product slug | `replacement_product_id uuid references products(id)` + redirect in `getStorefrontProductPage` |
| **D. Discontinued without replacement** | Permanent removal from index | `lifecycle_status text` or `discontinued_at timestamptz` |
| **F. Hidden / draft** | Exclude from storefront | `is_published boolean default true` |

---

## Proposed migration (future approval)

```sql
-- Proposal only — do not run in production without review

alter table public.products
  add column if not exists is_published boolean not null default true,
  add column if not exists lifecycle_status text not null default 'active'
    check (lifecycle_status in ('active', 'sold_out', 'paused', 'discontinued')),
  add column if not exists replacement_product_id uuid references public.products(id) on delete set null,
  add column if not exists discontinued_at timestamptz;

create index if not exists products_lifecycle_status_idx
  on public.products (lifecycle_status)
  where is_published = true;

comment on column public.products.lifecycle_status is
  'active: normal; sold_out: temporary OOS; paused: made-to-order pause; discontinued: permanent';
```

### Mapping to SEO policy after migration

| `lifecycle_status` | HTTP | robots | sitemap | Offer | Redirect |
|---|---|---|---|---|---|
| `active` | 200 | index | include | per fulfillment | — |
| `sold_out` | 200 | index | include | OutOfStock | — |
| `paused` | 200 | index | include | OutOfStock | — |
| `discontinued` + replacement | 308 | — | exclude old | — | replacement slug |
| `discontinued` no replacement | 200 | noindex, follow | exclude | OutOfStock or omit | — |
| `!is_published` | 404 | noindex | exclude | — | — |

### Code touchpoints after migration

1. `lib/storefront/repository.ts` — filter unpublished rows
2. `lib/seo/product-lifecycle.ts` (new) — `isProductEligibleForSitemap`, `buildProductRobotsMetadata`
3. `app/products/[slug]/page.tsx` — robots override for discontinued
4. `lib/product-route.ts` — replacement redirect (row C)
5. Admin UI — lifecycle editor

---

## Recommendation

1. Ship current code behavior (A/B/E) — no guesswork on D.
2. Prioritize `is_published` + `lifecycle_status` when catalog exceeds ~30 SKUs or first permanent discontinuation.
3. Add `replacement_product_id` when first SKU replacement is planned.
