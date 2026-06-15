import type { Metadata } from "next";

import { getCategoryImageSrc } from "@/lib/category-images";
import { isProductCategoryIndexable } from "@/lib/seo/category-indexability";
import { buildCategoryMetaDescription } from "@/lib/seo/category-description-seo";
import type { StorefrontCategory } from "@/lib/storefront/types";

type BuildCategoryMetadataInput = {
  category: StorefrontCategory;
  categories: StorefrontCategory[];
  productCategorySlugs: string[][];
  parent: StorefrontCategory | null;
};

export function buildCategoryPageMetadata({
  category,
  categories,
  productCategorySlugs,
  parent,
}: BuildCategoryMetadataInput): Metadata {
  const imageCategory = parent ?? category;
  const imageSrc = getCategoryImageSrc(
    imageCategory.slug,
    imageCategory.category_type,
  );
  const description = buildCategoryMetaDescription(category);
  const canonicalPath = `/categories/${category.slug}`;
  const indexable = isProductCategoryIndexable(
    categories,
    productCategorySlugs,
    category,
  );

  return {
    title: category.name,
    description,
    alternates: { canonical: canonicalPath },
    robots: indexable
      ? { index: true, follow: true }
      : { index: false, follow: true },
    openGraph: {
      title: category.name,
      description,
      url: canonicalPath,
      images: [imageSrc],
    },
    twitter: {
      card: "summary_large_image",
      title: category.name,
      description,
      images: [imageSrc],
    },
  };
}
