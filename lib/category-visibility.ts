import type { StorefrontCategory } from "@/lib/storefront/types";

export type CategoryVisibilitySource = Pick<
  StorefrontCategory,
  "id" | "parent_id" | "is_visible"
>;

export function buildCategoryVisibilityIndex<T extends CategoryVisibilitySource>(
  categories: T[],
): Map<string, T> {
  return new Map(categories.map((category) => [category.id, category]));
}

export function isCategoryStorefrontVisible<T extends CategoryVisibilitySource>(
  category: T,
  index: Map<string, T>,
): boolean {
  if (category.is_visible === false) {
    return false;
  }

  if (!category.parent_id) {
    return true;
  }

  const parent = index.get(category.parent_id);
  if (!parent) {
    return true;
  }

  return isCategoryStorefrontVisible(parent, index);
}

export function filterStorefrontVisibleCategories<
  T extends CategoryVisibilitySource & StorefrontCategory,
>(categories: T[]): T[] {
  const index = buildCategoryVisibilityIndex(categories);
  return categories.filter((category) =>
    isCategoryStorefrontVisible(category, index),
  );
}

export function findStorefrontVisibleCategory<
  T extends CategoryVisibilitySource & StorefrontCategory,
>(categories: T[], predicate: (category: T) => boolean): T | null {
  const index = buildCategoryVisibilityIndex(categories);
  const match = categories.find(predicate);
  if (!match || !isCategoryStorefrontVisible(match, index)) {
    return null;
  }

  return match;
}

export function findVisibleProductCategoryBySlug(
  categories: StorefrontCategory[],
  slug: string,
): StorefrontCategory | null {
  return findStorefrontVisibleCategory(
    categories,
    (category) => category.category_type === "product" && category.slug === slug,
  );
}

export function findVisibleOccasionCategoryBySlug(
  categories: StorefrontCategory[],
  slug: string,
): StorefrontCategory | null {
  return findStorefrontVisibleCategory(
    categories,
    (category) => category.category_type === "occasion" && category.slug === slug,
  );
}
