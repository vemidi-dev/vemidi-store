import type { CategoryType } from "@/lib/admin/types";
import { resolveCanonicalProductCategorySlug } from "@/lib/category-slug-aliases";

export const CATEGORY_INDEX_PATH = "/categorii";
export const OCCASION_INDEX_PATH = "/povodi";
export const MATERIAL_INDEX_PATH = "/zagotovki-i-materiali";

export function getCategoryPath(slug: string) {
  return `${CATEGORY_INDEX_PATH}/${encodeURIComponent(resolveCanonicalProductCategorySlug(slug))}`;
}

export function getOccasionPath(slug: string) {
  return `${OCCASION_INDEX_PATH}/${encodeURIComponent(slug)}`;
}

export function getMaterialPath(slug: string) {
  return `${MATERIAL_INDEX_PATH}/${encodeURIComponent(slug)}`;
}

export function getCategoryListingHref(category: {
  slug: string;
  category_type: CategoryType;
}) {
  if (category.category_type === "product") {
    return getCategoryPath(category.slug);
  }

  if (category.category_type === "material") {
    return getMaterialPath(category.slug);
  }

  return getOccasionPath(category.slug);
}
