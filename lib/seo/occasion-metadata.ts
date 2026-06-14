import type { Metadata } from "next";

import { getCategoryImageSrc } from "@/lib/category-images";
import { getOccasionPath } from "@/lib/category-url";
import { isOccasionIndexable } from "@/lib/seo/occasion-indexability";
import type { StorefrontCategory } from "@/lib/storefront/types";

type BuildOccasionMetadataInput = {
  occasion: StorefrontCategory;
  productCategorySlugs: string[][];
};

export function findOccasionCategory(
  categories: StorefrontCategory[],
  slug: string,
): StorefrontCategory | null {
  return (
    categories.find(
      (entry) => entry.category_type === "occasion" && entry.slug === slug,
    ) ?? null
  );
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
    productCategorySlugs,
  });
}

export function buildOccasionPageMetadata({
  occasion,
  productCategorySlugs,
}: BuildOccasionMetadataInput): Metadata {
  const imageSrc = getCategoryImageSrc(occasion.slug, occasion.category_type);
  const description =
    occasion.card_description?.trim() ||
    `Открийте персонализирани подаръци за „${occasion.name}“ от VeMiDi crafts.`;
  const canonicalPath = getOccasionPath(occasion.slug);
  const indexable = isOccasionIndexable(productCategorySlugs, occasion);

  return {
    title: occasion.name,
    description,
    alternates: { canonical: canonicalPath },
    robots: indexable
      ? { index: true, follow: true }
      : { index: false, follow: true },
    openGraph: {
      title: occasion.name,
      description,
      url: canonicalPath,
      images: [imageSrc],
    },
    twitter: {
      card: "summary_large_image",
      title: occasion.name,
      description,
      images: [imageSrc],
    },
  };
}
