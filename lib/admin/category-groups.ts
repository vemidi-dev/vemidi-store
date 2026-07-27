import type { CategoryType } from "@/lib/admin/types";

export const ADMIN_CATEGORY_GROUP_ORDER: CategoryType[] = [
  "product",
  "material",
  "occasion",
];

export const ADMIN_CATEGORY_GROUP_LABELS: Record<CategoryType, string> = {
  product: "Категории",
  material: "Заготовки и материали",
  occasion: "Поводи",
};

export const ADMIN_CATEGORY_GROUP_FILTER_LABELS: Record<CategoryType, string> = {
  product: "Категория",
  material: "Заготовки и материали",
  occasion: "Повод",
};

type CategoryWithType = {
  category_type?: CategoryType;
  categoryType?: CategoryType;
};

export function getCategoryTypeValue<T extends CategoryWithType>(
  category: T,
): CategoryType | undefined {
  return category.category_type ?? category.categoryType;
}

export function getAdminCategoryGroupLabel(categoryType: CategoryType): string {
  return ADMIN_CATEGORY_GROUP_LABELS[categoryType];
}

export function getAdminCategoryFilterLabel(categoryType: CategoryType): string {
  return ADMIN_CATEGORY_GROUP_FILTER_LABELS[categoryType];
}

export function filterCategoriesByType<T extends CategoryWithType>(
  categories: T[],
  categoryType: CategoryType,
): T[] {
  return categories.filter(
    (category) => getCategoryTypeValue(category) === categoryType,
  );
}

export function groupCategoriesByType<T extends CategoryWithType>(
  categories: T[],
): Array<[CategoryType, T[]]> {
  return ADMIN_CATEGORY_GROUP_ORDER.map((categoryType) => [
    categoryType,
    filterCategoriesByType(categories, categoryType),
  ]).filter((entry): entry is [CategoryType, T[]] => entry[1].length > 0);
}
