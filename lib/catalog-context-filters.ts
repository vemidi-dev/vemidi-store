import {
  getCategoryDisplayLabel,
  getCategoryFamilySlugs,
  sortCategoriesForDisplay,
} from "@/lib/category-hierarchy";
import type {
  StorefrontCategory,
  StorefrontProduct,
} from "@/lib/storefront/types";

export type ContextFilterOption = {
  value: string;
  label: string;
  count: number;
};

export function firstContextFilterValue(
  value: string | string[] | undefined,
): string {
  return (Array.isArray(value) ? value[0] ?? "" : value ?? "").trim();
}

export function hasContextFilterParams(
  params: Record<string, string | string[] | undefined>,
): boolean {
  return Object.keys(params).length > 0;
}

export function getOccasionFilterOptions(
  categories: StorefrontCategory[],
  products: StorefrontProduct[],
): ContextFilterOption[] {
  return categories
    .filter((category) => category.category_type === "occasion")
    .map((category) => ({
      value: category.slug,
      label: category.name,
      count: products.filter((product) =>
        product.categorySlugs.includes(category.slug),
      ).length,
    }))
    .filter((option) => option.count > 0)
    .sort((left, right) => left.label.localeCompare(right.label, "bg"));
}

export function getProductCategoryFilterOptions(
  categories: StorefrontCategory[],
  products: StorefrontProduct[],
): ContextFilterOption[] {
  return sortCategoriesForDisplay(
    categories.filter((category) => category.category_type === "product"),
  )
    .map((category) => {
      const familySlugs = new Set(getCategoryFamilySlugs(categories, category));
      return {
        value: category.slug,
        label: getCategoryDisplayLabel(categories, category),
        count: products.filter((product) =>
          product.categorySlugs.some((slug) => familySlugs.has(slug)),
        ).length,
      };
    })
    .filter((option) => option.count > 0);
}

export function filterProductsByOccasion(
  products: StorefrontProduct[],
  occasionSlug: string,
  options: ContextFilterOption[],
): StorefrontProduct[] {
  if (!occasionSlug || !options.some((option) => option.value === occasionSlug)) {
    return products;
  }

  return products.filter((product) =>
    product.categorySlugs.includes(occasionSlug),
  );
}

export function filterProductsByProductCategory(
  products: StorefrontProduct[],
  productCategorySlug: string,
  categories: StorefrontCategory[],
  options: ContextFilterOption[],
): StorefrontProduct[] {
  if (
    !productCategorySlug ||
    !options.some((option) => option.value === productCategorySlug)
  ) {
    return products;
  }

  const category = categories.find(
    (entry) =>
      entry.category_type === "product" &&
      entry.slug === productCategorySlug,
  );
  if (!category) {
    return products;
  }

  const familySlugs = new Set(getCategoryFamilySlugs(categories, category));
  return products.filter((product) =>
    product.categorySlugs.some((slug) => familySlugs.has(slug)),
  );
}
