# Google Merchant Feed MVP — implementation report

**Date:** 2026-08-13  
**Repo:** `D:\store-template`  
**Mode:** Code-only (no SQL migrations, no schema changes, no commit/push)  
**Depends on:** SEO Editor MVP `0052de2` (orthogonal; not required at runtime)

---

## Executive summary

Added a public Google Merchant RSS XML feed at `GET /api/merchant/google.xml` for **published + public** catalog products (parent items only). Pricing/availability reuse storefront catalog mapping (`getStorefrontCatalog` → `toProduct`). Products without a usable image are **skipped**. No GTIN / google_product_category / variants / Content API / feed secret.

---

## Endpoint

| | |
|--|--|
| Path | `/api/merchant/google.xml` |
| Method | `GET` |
| Content-Type | `application/xml; charset=utf-8` |
| Format | RSS 2.0 + `xmlns:g="http://base.google.com/ns/1.0"` |
| Data source | `getStorefrontCatalog()` + `getSiteUrl()` |
| Cache | `public, s-maxage=300, stale-while-revalidate=600` |

Empty catalog → valid channel with zero `<item>` elements.

---

## Item fields

| Tag | Source |
|-----|--------|
| `g:id` | `productCode` (trimmed), else product UUID |
| `g:title` | `product.title` |
| `g:description` | Normalized visible description; else composed SEO meta fallback; else title |
| `g:link` | Absolute `/produkti/{slug}` via `getSiteUrl()` |
| `g:image_link` | First absolute product image URL |
| `g:additional_image_link` | Remaining images (nice-to-have) |
| `g:availability` | `in_stock` / `out_of_stock` / `preorder` (see below) |
| `g:price` | Listing `product.price` as `19.90 EUR` (promo-aware from catalog mapper) |
| `g:condition` | `new` |
| `g:brand` | `siteConfig.name` |
| `g:mpn` | product code when present |
| `g:identifier_exists` | `false` |
| `g:product_type` | Primary category path (`Parent > Child`) when available |

### Availability mapping

| Storefront state | Google value |
|------------------|--------------|
| orderable + `stocked` | `in_stock` |
| orderable + `made_to_order` | `preorder` |
| not orderable / sold out / `unavailable` | `out_of_stock` |

---

## Filtering rules

1. **Catalog query** (existing): `status=published` AND `visibility=public` in `getStorefrontCatalog`.
2. **Defense-in-depth helper**: `filterMerchantFeedProducts` keeps only `isProductStorefrontPublished` + `isProductCatalogVisible` (excludes draft/archived/upsell_only).
3. **Image gate**: products with no resolvable `image_link` are **skipped** (not emitted as incomplete items).
4. **Parent-only**: one feed item per product; option/color variants are not exploded.

---

## Changed files

### New

- `lib/merchant/google-feed.ts` — pure builder, escape, mapping, filter
- `app/api/merchant/google.xml/route.ts` — HTTP endpoint
- `tests/google-merchant-feed.test.ts`
- `docs/google-merchant-feed-mvp-report.md`

### Modified

- `scripts/release-tests.mjs` — include merchant feed tests in SEO & routes group

---

## Known limitations

- Public unauthenticated feed (no `MERCHANT_FEED_SECRET` yet).
- No `sale_price` / compare-at split — single listing `price` only.
- Made-to-order mapped to `preorder` (Merchant policy may need review per brand).
- Products without images omitted entirely.
- No per-product “exclude from feed” admin toggle.
- Brand is placeholder `siteConfig.name` until client branding.

---

## Deferred (later / migrations)

- GTIN columns
- `google_product_category` admin/DB field
- `custom_label_*` for ads ops
- Variant/child feed items + `item_group_id`
- Content API sync
- Optional feed token / robots considerations
- Explicit `sale_price` when promo active

---

## Tests / result

| Command | Result |
|---------|--------|
| `npm run typecheck` | **PASS** |
| `npx tsx --test tests/google-merchant-feed.test.ts` | **12/12 PASS** |
| `npm run test:release:unit` | **PASS** |

Covered: XML escaping, empty feed, required tags, exclusion of draft/upsell/archived, absolute URLs, image skip, availability, EUR price, `identifier_exists=false`, description fallbacks, additional images, deterministic order.

### Known unrelated noise

- Node `DEP0190` from `release-tests.mjs` spawn on Windows (pre-existing).

---

## `git status --short`

```
## main...origin/main
 M scripts/release-tests.mjs
?? app/api/merchant/
?? lib/merchant/
?? tests/google-merchant-feed.test.ts
?? docs/google-merchant-feed-mvp-report.md
```

**Ready for review/commit:** yes (code-only; verification green). Not committed/pushed per request.
