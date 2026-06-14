import { getCategoryFamilySlugs } from "@/lib/category-hierarchy";
import type { StorefrontCategory, StorefrontProduct } from "@/lib/storefront/types";

export function parseSitemapTimestamp(
  value: string | null | undefined,
): Date | undefined {
  if (!value?.trim()) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function recordLatestTimestamp(
  lastModifiedBySlug: Map<string, Date>,
  slug: string,
  timestamp: Date,
) {
  const existing = lastModifiedBySlug.get(slug);
  if (!existing || timestamp > existing) {
    lastModifiedBySlug.set(slug, timestamp);
  }
}

export function resolveProductLastModified(
  product: Pick<StorefrontProduct, "updatedAt" | "createdAt">,
): Date | undefined {
  return (
    parseSitemapTimestamp(product.updatedAt) ??
    parseSitemapTimestamp(product.createdAt)
  );
}

export function buildCategoryLastModifiedBySlug(
  categories: StorefrontCategory[],
  products: Pick<StorefrontProduct, "categorySlugs" | "updatedAt" | "createdAt">[],
): Map<string, Date> {
  const lastModifiedBySlug = new Map<string, Date>();

  products.forEach((product) => {
    const timestamp = resolveProductLastModified(product);
    if (!timestamp) {
      return;
    }

    product.categorySlugs.forEach((slug) => {
      recordLatestTimestamp(lastModifiedBySlug, slug, timestamp);
    });
  });

  categories
    .filter((category) => category.category_type === "product")
    .forEach((category) => {
      const familySlugs = getCategoryFamilySlugs(categories, category);
      let latest: Date | undefined;

      familySlugs.forEach((slug) => {
        const timestamp = lastModifiedBySlug.get(slug);
        if (timestamp && (!latest || timestamp > latest)) {
          latest = timestamp;
        }
      });

      if (latest) {
        recordLatestTimestamp(lastModifiedBySlug, category.slug, latest);
      }
    });

  return lastModifiedBySlug;
}

export function resolveCategoryLastModified(
  category: Pick<StorefrontCategory, "slug" | "createdAt">,
  lastModifiedBySlug: Map<string, Date>,
): Date | undefined {
  return (
    lastModifiedBySlug.get(category.slug) ??
    parseSitemapTimestamp(category.createdAt)
  );
}

export function buildSitemapEntry(
  url: string,
  lastModified: Date | undefined,
  changeFrequency: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never",
  priority: number,
) {
  return {
    url,
    ...(lastModified ? { lastModified } : {}),
    changeFrequency,
    priority,
  };
}
