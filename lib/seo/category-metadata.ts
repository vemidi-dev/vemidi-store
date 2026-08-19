import type { Metadata } from "next";

import { resolveCategoryCoverImage } from "@/lib/category-image-resolution";
import { getCategoryPath } from "@/lib/category-url";
import { isProductCategoryIndexable } from "@/lib/seo/category-indexability";
import { buildCategoryMetaDescription } from "@/lib/seo/category-description-seo";
import {
  resolveCategoryMetaTitle,
  resolveCategoryOgDescription,
  resolveCategoryOgTitle,
  resolveCategoryPageRobots,
} from "@/lib/seo/category-page-content";
import { OG_DEFAULTS } from "@/lib/seo/social-images";
import type { StorefrontCategory } from "@/lib/storefront/types";

type BuildCategoryMetadataInput = {
  category: StorefrontCategory;
  categories: StorefrontCategory[];
  productCategorySlugs: string[][];
  parent: StorefrontCategory | null;
  faceted?: boolean;
};

export function buildCategoryPageMetadata({
  category,
  categories,
  productCategorySlugs,
  parent,
  faceted = false,
}: BuildCategoryMetadataInput): Metadata {
  const heroImage = resolveCategoryCoverImage(category, parent);
  const title = resolveCategoryMetaTitle(category);
  const description = buildCategoryMetaDescription(category);
  const ogTitle = resolveCategoryOgTitle(category, title);
  const ogDescription = resolveCategoryOgDescription(category, description);
  const canonicalPath = getCategoryPath(category.slug);
  const indexable = isProductCategoryIndexable(
    categories,
    productCategorySlugs,
    category,
  );

  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    robots: resolveCategoryPageRobots({
      faceted,
      indexable,
      robotsIndex: category.robots_index,
    }),
    openGraph: {
      type: "website",
      ...OG_DEFAULTS,
      title: ogTitle,
      description: ogDescription,
      url: canonicalPath,
      images: heroImage.src
        ? [{ url: heroImage.src, alt: ogTitle }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDescription,
      images: heroImage.src ? [heroImage.src] : undefined,
    },
  };
}
