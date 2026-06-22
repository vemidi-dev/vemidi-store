import type { Metadata } from "next";

import { resolveCategoryCoverImage } from "@/lib/category-image-resolution";
import { getOccasionPath } from "@/lib/category-url";
import { findVisibleOccasionCategoryBySlug } from "@/lib/category-visibility";
import { isOccasionIndexable } from "@/lib/seo/occasion-indexability";
import type { StorefrontCategory } from "@/lib/storefront/types";

type BuildOccasionMetadataInput = {
  occasion: StorefrontCategory;
  categories: StorefrontCategory[];
  productCategorySlugs: string[][];
  faceted?: boolean;
};

export function findOccasionCategory(
  categories: StorefrontCategory[],
  slug: string,
): StorefrontCategory | null {
  return findVisibleOccasionCategoryBySlug(categories, slug);
}

export function buildInvalidOccasionMetadata(): Metadata {
  return {
    title: "Поводът не е намерен",
    robots: { index: false, follow: true },
  };
}

export function resolveOccasionPageMetadata(
  slug: string,
  categories: StorefrontCategory[],
  productCategorySlugs: string[][],
): Metadata {
  const occasion = findOccasionCategory(categories, slug);
  if (!occasion) {
    return buildInvalidOccasionMetadata();
  }

  return buildOccasionPageMetadata({
    occasion,
    categories,
    productCategorySlugs,
  });
}

export function buildOccasionPageMetadata({
  occasion,
  categories,
  productCategorySlugs,
  faceted = false,
}: BuildOccasionMetadataInput): Metadata {
  const heroImage = resolveCategoryCoverImage(occasion);
  const description =
    occasion.card_description?.trim() ||
    `Открийте персонализирани подаръци за „${occasion.name}“ от VeMiDi crafts.`;
  const canonicalPath = getOccasionPath(occasion.slug);
  const indexable = isOccasionIndexable(categories, productCategorySlugs, occasion);

  return {
    title: occasion.name,
    description,
    alternates: { canonical: canonicalPath },
    robots: !faceted && indexable
      ? { index: true, follow: true }
      : { index: false, follow: true },
    openGraph: {
      title: occasion.name,
      description,
      url: canonicalPath,
      images: heroImage.src ? [heroImage.src] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: occasion.name,
      description,
      images: heroImage.src ? [heroImage.src] : undefined,
    },
  };
}
