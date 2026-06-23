import { resolveCanonicalProductCategorySlug } from "@/lib/category-slug-aliases";
import { firstContextFilterValue } from "@/lib/catalog-context-filters";
import { isUuid } from "@/lib/is-uuid";

export const CATALOG_OCCASION_FILTER_PARAM = "povod";
export const CATALOG_PRODUCT_CATEGORY_FILTER_PARAM = "vid";

export const LEGACY_CATALOG_OCCASION_FILTER_PARAM = "occasion";
export const LEGACY_CATALOG_PRODUCT_CATEGORY_FILTER_PARAM = "product";

export function isCatalogProductCategoryFilterSlug(value: string): boolean {
  const trimmed = value.trim();
  return Boolean(trimmed) && !isUuid(trimmed);
}

export function readCatalogOccasionFilterValue(
  params: Record<string, string | string[] | undefined>,
): string {
  return firstContextFilterValue(
    params[CATALOG_OCCASION_FILTER_PARAM] ??
      params[LEGACY_CATALOG_OCCASION_FILTER_PARAM],
  );
}

export function readCatalogProductCategoryFilterValue(
  params: Record<string, string | string[] | undefined>,
): string {
  return firstContextFilterValue(
    params[CATALOG_PRODUCT_CATEGORY_FILTER_PARAM] ??
      params[LEGACY_CATALOG_PRODUCT_CATEGORY_FILTER_PARAM],
  );
}

export function normalizeCatalogFilterSearchParams(
  searchParams: URLSearchParams,
): URLSearchParams | null {
  let changed = false;
  const normalized = new URLSearchParams();
  const hasPovod = searchParams.has(CATALOG_OCCASION_FILTER_PARAM);
  const hasVid = searchParams.has(CATALOG_PRODUCT_CATEGORY_FILTER_PARAM);

  for (const [key, value] of searchParams.entries()) {
    if (key === LEGACY_CATALOG_OCCASION_FILTER_PARAM) {
      if (!hasPovod) {
        normalized.append(CATALOG_OCCASION_FILTER_PARAM, value);
      }
      changed = true;
      continue;
    }

    if (key === CATALOG_OCCASION_FILTER_PARAM) {
      normalized.append(key, value);
      continue;
    }

    if (key === LEGACY_CATALOG_PRODUCT_CATEGORY_FILTER_PARAM) {
      if (!isCatalogProductCategoryFilterSlug(value)) {
        normalized.append(key, value);
        continue;
      }

      if (!hasVid) {
        const canonical = resolveCanonicalProductCategorySlug(value);
        normalized.append(CATALOG_PRODUCT_CATEGORY_FILTER_PARAM, canonical);
        if (canonical !== value) {
          changed = true;
        }
      }
      changed = true;
      continue;
    }

    if (key === CATALOG_PRODUCT_CATEGORY_FILTER_PARAM) {
      const canonical = resolveCanonicalProductCategorySlug(value);
      normalized.append(key, canonical);
      if (canonical !== value) {
        changed = true;
      }
      continue;
    }

    normalized.append(key, value);
  }

  return changed ? normalized : null;
}
