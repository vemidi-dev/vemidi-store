import { resolveCanonicalProductCategorySlug } from "@/lib/category-slug-aliases";

export const CATEGORY_INDEX_PATH = "/categorii";
export const OCCASION_INDEX_PATH = "/povodi";

export function getCategoryPath(slug: string) {
  return `${CATEGORY_INDEX_PATH}/${encodeURIComponent(resolveCanonicalProductCategorySlug(slug))}`;
}

export function getOccasionPath(slug: string) {
  return `${OCCASION_INDEX_PATH}/${encodeURIComponent(slug)}`;
}

export function getCategoryListingHref(category: {
  slug: string;
  category_type: "product" | "occasion";
}) {
  if (category.category_type === "product") {
    return getCategoryPath(category.slug);
  }

  return getOccasionPath(category.slug);
}
