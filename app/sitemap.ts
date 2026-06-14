import type { MetadataRoute } from "next";

import {
  filterIndexableProductCategories,
  getProductCategorySlugs,
} from "@/lib/seo/category-indexability";
import { getStorefrontCatalog } from "@/lib/storefront/repository";
import { getSiteUrl } from "@/lib/site-url";
import { getPublishedBlogPosts, getPublishedEvents } from "@/lib/content/repository";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const [{ categories, products }, blogPosts, events] = await Promise.all([
    getStorefrontCatalog(),
    getPublishedBlogPosts(),
    getPublishedEvents(),
  ]);
  const now = new Date();
  const productCategorySlugs = getProductCategorySlugs(products);
  const indexableCategories = filterIndexableProductCategories(
    categories,
    productCategorySlugs,
  );

  const staticRoutes = [
    { path: "", priority: 1, changeFrequency: "weekly" as const },
    { path: "/shop", priority: 0.9, changeFrequency: "daily" as const },
    { path: "/categories", priority: 0.8, changeFrequency: "weekly" as const },
    { path: "/blog", priority: 0.6, changeFrequency: "weekly" as const },
    { path: "/events", priority: 0.6, changeFrequency: "weekly" as const },
    { path: "/occasions", priority: 0.7, changeFrequency: "weekly" as const },
    { path: "/about", priority: 0.5, changeFrequency: "monthly" as const },
    { path: "/contact", priority: 0.5, changeFrequency: "monthly" as const },
    { path: "/delivery", priority: 0.4, changeFrequency: "monthly" as const },
    { path: "/returns", priority: 0.3, changeFrequency: "monthly" as const },
    { path: "/terms", priority: 0.3, changeFrequency: "monthly" as const },
    { path: "/privacy", priority: 0.3, changeFrequency: "monthly" as const },
    { path: "/cookies", priority: 0.3, changeFrequency: "monthly" as const },
  ];

  return [
    ...staticRoutes.map((route) => ({
      url: new URL(route.path || "/", siteUrl).toString(),
      lastModified: now,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
    ...products.map((product) => ({
      url: new URL(`/products/${product.slug}`, siteUrl).toString(),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...indexableCategories.map((category) => ({
      url: new URL(`/categories/${category.slug}`, siteUrl).toString(),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: category.parent_id ? 0.6 : 0.7,
    })),
    ...blogPosts.map((post) => ({
      url: new URL(`/blog/${post.slug}`, siteUrl).toString(),
      lastModified: new Date(post.updated_at),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...events.map((event) => ({
      url: new URL(`/events/${event.slug}`, siteUrl).toString(),
      lastModified: new Date(event.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
