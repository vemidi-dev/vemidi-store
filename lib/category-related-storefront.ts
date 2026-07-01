import {
  filterSelectableRelatedCategories,
  type CategoryRelatedSelectorCategory,
} from "@/lib/admin/category-related";
import type { StorefrontCategory } from "@/lib/storefront/types";

export function getRelatedCategoriesForCategory(
  categories: StorefrontCategory[],
  relatedCategoryIdsByCategoryId: Map<string, string[]>,
  currentCategory: StorefrontCategory,
): StorefrontCategory[] {
  if (currentCategory.category_type !== "product") {
    return [];
  }

  const relatedCategoryIds =
    relatedCategoryIdsByCategoryId.get(currentCategory.id) ?? [];
  if (relatedCategoryIds.length === 0) {
    return [];
  }

  const selectableIds = new Set(
    filterSelectableRelatedCategories(
      categories as CategoryRelatedSelectorCategory[],
      { excludeCategoryId: currentCategory.id },
    ).map((category) => category.id),
  );
  const categoryById = new Map(
    categories.map((category) => [category.id, category]),
  );

  return relatedCategoryIds
    .map((relatedCategoryId) => categoryById.get(relatedCategoryId) ?? null)
    .filter(
      (category): category is StorefrontCategory =>
        category !== null && selectableIds.has(category.id),
    );
}
