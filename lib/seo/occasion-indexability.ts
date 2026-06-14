import { getCategoryProductCount } from "@/lib/category-hierarchy";
import type { StorefrontCategory } from "@/lib/storefront/types";

export function isOccasionIndexable(
  productCategorySlugs: string[][],
  occasion: StorefrontCategory,
): boolean {
  if (occasion.category_type !== "occasion") {
    return false;
  }

  return getCategoryProductCount(productCategorySlugs, [occasion.slug]) > 0;
}

export function filterIndexableOccasions(
  categories: StorefrontCategory[],
  productCategorySlugs: string[][],
): StorefrontCategory[] {
  return categories.filter(
    (category) =>
      category.category_type === "occasion" &&
      isOccasionIndexable(productCategorySlugs, category),
  );
}
