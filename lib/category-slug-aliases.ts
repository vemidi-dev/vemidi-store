/**
 * Legacy product-category slugs that should permanently redirect to the
 * canonical slug used in the storefront catalog.
 */
export const LEGACY_PRODUCT_CATEGORY_SLUGS: Readonly<Record<string, string>> = {
  "plik-za-pari": "plikove-za-pari",
};

export function isLegacyProductCategorySlug(slug: string): boolean {
  return Object.prototype.hasOwnProperty.call(LEGACY_PRODUCT_CATEGORY_SLUGS, slug);
}

export function resolveCanonicalProductCategorySlug(slug: string): string {
  return LEGACY_PRODUCT_CATEGORY_SLUGS[slug] ?? slug;
}

export function getLegacyProductCategoryRedirect(slug: string): string | null {
  return LEGACY_PRODUCT_CATEGORY_SLUGS[slug] ?? null;
}

import { normalizeCatalogFilterSearchParams } from "@/lib/catalog-filter-query-params";

export function normalizeProductCategoryQueryParams(
  searchParams: URLSearchParams,
): URLSearchParams | null {
  return normalizeCatalogFilterSearchParams(searchParams);
}
