import {
  getCategoryFamilySlugs,
  getCategoryProductCount,
} from "@/lib/category-hierarchy";
import type { StorefrontCategory } from "@/lib/storefront/types";

export function getProductCategorySlugs(
  products: Array<{ categorySlugs: string[] }>,
): string[][] {
  return products.map((product) => product.categorySlugs);
}

export function isProductCategoryIndexable(
  categories: StorefrontCategory[],
  productCategorySlugs: string[][],
  category: StorefrontCategory,
): boolean {
  if (category.category_type !== "product") {
    return false;
  }

  const familySlugs = getCategoryFamilySlugs(categories, category);
  return getCategoryProductCount(productCategorySlugs, familySlugs) > 0;
}

export function filterIndexableProductCategories(
  categories: StorefrontCategory[],
  productCategorySlugs: string[][],
): StorefrontCategory[] {
  return categories.filter(
    (category) =>
      category.category_type === "product" &&
      isProductCategoryIndexable(categories, productCategorySlugs, category),
  );
}
