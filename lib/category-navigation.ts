import { sortCategoriesForDisplay } from "@/lib/category-hierarchy";
import { filterStorefrontVisibleCategories } from "@/lib/category-visibility";
import {
  CATEGORY_INDEX_PATH,
  MATERIAL_INDEX_PATH,
  OCCASION_INDEX_PATH,
  getCategoryPath,
  getMaterialPath,
  getOccasionPath,
} from "@/lib/category-url";
import type { StorefrontCategory } from "@/lib/storefront/types";

export type HeaderNavDropdownItem = {
  id: string;
  name: string;
  href: string;
  isChild: boolean;
};

export function buildProductCategoryNavItems(
  categories: StorefrontCategory[],
): HeaderNavDropdownItem[] {
  return sortCategoriesForDisplay(
    filterStorefrontVisibleCategories(categories).filter(
      (category) => category.category_type === "product",
    ),
  ).map((category) => ({
    id: category.id,
    name: category.name,
    href: getCategoryPath(category.slug),
    isChild: category.parent_id !== null,
  }));
}

export function buildOccasionCategoryNavItems(
  categories: StorefrontCategory[],
): HeaderNavDropdownItem[] {
  return filterStorefrontVisibleCategories(categories)
    .filter((category) => category.category_type === "occasion")
    .sort(
      (left, right) =>
        left.home_sort_order - right.home_sort_order ||
        left.name.localeCompare(right.name, "bg"),
    )
    .map((category) => ({
      id: category.id,
      name: category.name,
      href: getOccasionPath(category.slug),
      isChild: false,
    }));
}

export function buildMaterialCategoryNavItems(
  categories: StorefrontCategory[],
): HeaderNavDropdownItem[] {
  return sortCategoriesForDisplay(
    filterStorefrontVisibleCategories(categories).filter(
      (category) => category.category_type === "material",
    ),
  ).map((category) => ({
    id: category.id,
    name: category.name,
    href: getMaterialPath(category.slug),
    isChild: category.parent_id !== null,
  }));
}

export const HEADER_CATEGORY_DROPDOWN = {
  href: CATEGORY_INDEX_PATH,
  indexLabel: "Всички категории",
} as const;

export const HEADER_OCCASION_DROPDOWN = {
  href: OCCASION_INDEX_PATH,
  indexLabel: "Всички поводи",
} as const;

export const HEADER_MATERIAL_DROPDOWN = {
  href: MATERIAL_INDEX_PATH,
  indexLabel: "Всички заготовки и материали",
} as const;
