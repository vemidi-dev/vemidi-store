# SEO Editor MVP — implementation report

**Date:** 2026-08-13  
**Repo:** `D:\store-template`  
**Mode:** Code-only (no SQL migrations, no schema changes, no commit/push)

---

## Executive summary

Added an admin **SEO** tab with an overview of products + categories/occasions/materials (existing meta/OG/`robots_index` fields), deep-links into existing edit UIs, and a read-only **Resolved preview** on product/category SEO forms using the same storefront resolvers/fallbacks. Empty meta fields still produce fallback titles/descriptions. No checkout/cart/Merchant/Meta/campaign changes.

---

## What was added

1. **Admin tab `seo`** in the central management nav (`AdminHeader` → “SEO”).
2. **`SeoOverviewPanel`** — summary cards + tables for:
   - name/title, slug
   - meta_title / meta_description present?
   - meta_description length
   - og_title / og_description present?
   - robots_index display (categories/occasions/materials)
   - completeness badge (complete / partial / missing)
   - deep-link: products → `?tab=products&editProduct=…`; categories → `?tab=categories&categoryType=…#category-edit-…`
3. **Resolved preview** on `ProductContentSeoFields` and `CategoryContentSeoFields`:
   - resolved meta title/description
   - resolved OG title/description
   - note for layout title template `| {siteConfig.name}`
4. **Helpers** (unit-tested):
   - `lib/admin/seo-overview.ts`
   - `lib/admin/seo-resolved-preview.ts` (wraps storefront resolvers)

### Admin integration decision

There is a central `AdminTab` registry (`lib/admin/types.ts` + `normalizeAdminTab` + `AdminHeader`). A dedicated **SEO** tab was added there (next to Categories), with a lightweight data load in `app/admin/page.tsx` (products + categories SEO columns only). This avoids embedding the audit inside Products/Content and keeps edit deep-links to existing forms.

---

## Existing DB fields used (no new columns)

| Entity | Fields |
|--------|--------|
| Products | `meta_title`, `meta_description`, `og_title`, `og_description` (+ `name`, `slug` for display/preview) |
| Categories / occasions / materials | `meta_title`, `meta_description`, `og_title`, `og_description`, `robots_index` (+ `name`, `slug`, `category_type`) |

Fallback resolvers reused:

- `resolveProductMetaTitle` / OG helpers + `buildProductMetaDescription`
- `resolveCategoryMetaTitle` / OG helpers + `buildCategoryMetaDescription` / `buildOccasionMetaDescription`
- Layout title template from `app/layout.tsx`: `%s | ${siteConfig.name}`

---

## Intentionally deferred (later / migrations)

- Product `robots_index` column
- Blog / event dedicated SEO columns
- Hub / home / info-page SEO editor
- Dedicated `og_image` override
- Live (client-side) preview while typing — preview is based on saved/default form values
- Inline SEO edit drawer (overview deep-links only)
- Google Merchant feed / Meta Pixel (out of scope for this package)

---

## Changed files

### New

- `components/admin/seo-overview-panel.tsx`
- `components/admin/seo-resolved-preview.tsx`
- `lib/admin/seo-overview.ts`
- `lib/admin/seo-resolved-preview.ts`
- `tests/seo-editor-mvp.test.ts`
- `docs/seo-editor-mvp-report.md`

### Modified

- `app/admin/page.tsx` — SEO tab data load + panel
- `components/admin/admin-header.tsx` — SEO nav item
- `components/admin/product-content-seo-fields.tsx` — resolved preview
- `components/admin/category-content-seo-fields.tsx` — resolved preview
- `components/admin/product-list-panel.tsx` — primary category context for preview
- `components/admin/product-create-panel.tsx` — preview name/description
- `lib/admin/types.ts` — `AdminTab` + `"seo"`
- `lib/admin/params.ts` — `normalizeAdminTab("seo")`
- `lib/admin/form-data.ts` — `getAdminTab` accepts `seo`
- `tests/admin-form-data.test.ts` — seo tab in list
- `scripts/release-tests.mjs` — include `tests/seo-editor-mvp.test.ts`

---

## Tests and results

| Command | Result |
|---------|--------|
| `npm run typecheck` | **PASS** |
| Targeted: `tsx --test tests/seo-editor-mvp.test.ts tests/admin-form-data.test.ts tests/product-page-seo.test.ts tests/product-admin-content.test.ts` | **25/25 PASS** |
| `npm run test:release:unit` | **PASS** (all groups, including SEO & routes) |

Covered: overview status logic, robots_index display, resolved preview fallbacks, empty meta → non-empty fallbacks, admin tab recognition.

---

## Known unrelated failures / noise

- None from this suite. `test:release:unit` fully passed.
- Node `DEP0190` deprecation warning from `scripts/release-tests.mjs` (`spawnSync` + `shell: true` on Windows) — pre-existing, unrelated to SEO MVP.

---

## `git status --short`

```
## main...origin/main
 M app/admin/page.tsx
 M components/admin/admin-header.tsx
 M components/admin/category-content-seo-fields.tsx
 M components/admin/product-content-seo-fields.tsx
 M components/admin/product-create-panel.tsx
 M components/admin/product-list-panel.tsx
 M lib/admin/form-data.ts
 M lib/admin/params.ts
 M lib/admin/types.ts
 M scripts/release-tests.mjs
 M tests/admin-form-data.test.ts
?? components/admin/seo-overview-panel.tsx
?? components/admin/seo-resolved-preview.tsx
?? lib/admin/seo-overview.ts
?? lib/admin/seo-resolved-preview.ts
?? tests/seo-editor-mvp.test.ts
?? docs/seo-editor-mvp-report.md
```

**Ready for review/commit:** yes (code-only; no migrations; verification green). Not committed/pushed per request.
