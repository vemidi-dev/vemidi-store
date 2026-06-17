import type { MetadataRoute } from "next";

import { isLegacyProductCategorySlug } from "@/lib/category-slug-aliases";
import {
  filterIndexableProductCategories,
  getProductCategorySlugs,
} from "@/lib/seo/category-indexability";
import { filterIndexableOccasions } from "@/lib/seo/occasion-indexability";
import {
  buildCategoryLastModifiedBySlug,
  buildSitemapEntry,
  parseSitemapTimestamp,
  resolveCategoryLastModified,
  resolveProductLastModified,
} from "@/lib/seo/sitemap-last-modified";
import { getStorefrontCatalog } from "@/lib/storefront/repository";
import { getSiteUrl } from "@/lib/site-url";
import { getPublishedBlogPosts, getPublishedEvents } from "@/lib/content/repository";
import {
  CATEGORY_INDEX_PATH,
  OCCASION_INDEX_PATH,
  getCategoryPath,
  getOccasionPath,
} from "@/lib/category-url";
import { getProductPath } from "@/lib/product-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const [{ categories, products }, blogPosts, events] = await Promise.all([
    getStorefrontCatalog(),
    getPublishedBlogPosts(),
    getPublishedEvents(),
  ]);
  const productCategorySlugs = getProductCategorySlugs(products);
  const indexableCategories = filterIndexableProductCategories(
    categories,
    productCategorySlugs,
  ).filter((category) => !isLegacyProductCategorySlug(category.slug));
  const indexableOccasions = filterIndexableOccasions(
    categories,
    productCategorySlugs,
  );
  const categoryLastModifiedBySlug = buildCategoryLastModifiedBySlug(
    categories,
    products,
  );

  const staticRoutes = [
    { path: "", priority: 1, changeFrequency: "weekly" as const },
    { path: "/producti", priority: 0.9, changeFrequency: "daily" as const },
    { path: CATEGORY_INDEX_PATH, priority: 0.8, changeFrequency: "weekly" as const },
    { path: "/blog", priority: 0.6, changeFrequency: "weekly" as const },
    { path: "/sabitiya", priority: 0.6, changeFrequency: "weekly" as const },
    { path: OCCASION_INDEX_PATH, priority: 0.7, changeFrequency: "weekly" as const },
    { path: "/za-nas", priority: 0.5, changeFrequency: "monthly" as const },
    { path: "/kontakti", priority: 0.5, changeFrequency: "monthly" as const },
    { path: "/delivery", priority: 0.4, changeFrequency: "monthly" as const },
    { path: "/returns", priority: 0.3, changeFrequency: "monthly" as const },
    { path: "/terms", priority: 0.3, changeFrequency: "monthly" as const },
    { path: "/privacy", priority: 0.3, changeFrequency: "monthly" as const },
    { path: "/cookies", priority: 0.3, changeFrequency: "monthly" as const },
  ];

  return [
    ...staticRoutes.map((route) =>
      buildSitemapEntry(
        new URL(route.path || "/", siteUrl).toString(),
        undefined,
        route.changeFrequency,
        route.priority,
      ),
    ),
    ...products.map((product) =>
      buildSitemapEntry(
        new URL(getProductPath(product.slug), siteUrl).toString(),
        resolveProductLastModified(product),
        "weekly",
        0.7,
      ),
    ),
    ...indexableCategories.map((category) =>
      buildSitemapEntry(
        new URL(getCategoryPath(category.slug), siteUrl).toString(),
        resolveCategoryLastModified(category, categoryLastModifiedBySlug),
        "weekly",
        category.parent_id ? 0.6 : 0.7,
      ),
    ),
    ...indexableOccasions.map((occasion) =>
      buildSitemapEntry(
        new URL(getOccasionPath(occasion.slug), siteUrl).toString(),
        resolveCategoryLastModified(occasion, categoryLastModifiedBySlug),
        "weekly",
        0.7,
      ),
    ),
    ...blogPosts.map((post) =>
      buildSitemapEntry(
        new URL(`/blog/${post.slug}`, siteUrl).toString(),
        parseSitemapTimestamp(post.updated_at),
        "monthly",
        0.6,
      ),
    ),
    ...events.map((event) =>
      buildSitemapEntry(
        new URL(`/sabitiya/${event.slug}`, siteUrl).toString(),
        parseSitemapTimestamp(event.updated_at),
        "weekly",
        0.6,
      ),
    ),
  ];
}
