export type HierarchicalCategory = {
  id: string;
  name: string;
  slug: string;
  category_type: "product" | "occasion";
  parent_id: string | null;
  home_sort_order: number;
};

function compareCategories(
  left: HierarchicalCategory,
  right: HierarchicalCategory,
): number {
  const orderDifference = left.home_sort_order - right.home_sort_order;
  return orderDifference || left.name.localeCompare(right.name, "bg");
}

export function getTopLevelCategories<T extends HierarchicalCategory>(
  categories: T[],
  categoryType?: T["category_type"],
): T[] {
  return categories
    .filter(
      (category) =>
        category.parent_id === null &&
        (!categoryType || category.category_type === categoryType),
    )
    .sort(compareCategories);
}

export function getChildCategories<T extends HierarchicalCategory>(
  categories: T[],
  parentId: string,
): T[] {
  return categories
    .filter((category) => category.parent_id === parentId)
    .sort(compareCategories);
}

export function getCategoryFamilySlugs<T extends HierarchicalCategory>(
  categories: T[],
  category: T,
): string[] {
  return [
    category.slug,
    ...getChildCategories(categories, category.id).map((child) => child.slug),
  ];
}

export function getCategoryProductCount(
  productCategorySlugs: string[][],
  categorySlugs: string[],
): number {
  const acceptedSlugs = new Set(categorySlugs);
  return productCategorySlugs.filter((slugs) =>
    slugs.some((slug) => acceptedSlugs.has(slug)),
  ).length;
}

export function getCategoryDisplayLabel<T extends HierarchicalCategory>(
  categories: T[],
  category: T,
): string {
  const parent = category.parent_id
    ? categories.find((entry) => entry.id === category.parent_id)
    : null;
  return parent ? `${parent.name} / ${category.name}` : category.name;
}

export function sortCategoriesForDisplay<T extends HierarchicalCategory>(
  categories: T[],
): T[] {
  const roots = categories
    .filter((category) => category.parent_id === null)
    .sort(compareCategories);
  const rootIds = new Set(roots.map((category) => category.id));
  const nested = roots.flatMap((root) => [
    root,
    ...categories
      .filter((category) => category.parent_id === root.id)
      .sort(compareCategories),
  ]);
  const orphans = categories
    .filter(
      (category) =>
        category.parent_id !== null && !rootIds.has(category.parent_id),
    )
    .sort(compareCategories);
  return [...nested, ...orphans];
}
