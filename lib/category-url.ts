export function getCategoryPath(slug: string) {
  return `/categories/${encodeURIComponent(slug)}`;
}

export function getCategoryListingHref(category: {
  slug: string;
  category_type: "product" | "occasion";
}) {
  if (category.category_type === "product") {
    return getCategoryPath(category.slug);
  }

  return `/shop?occasion=${encodeURIComponent(category.slug)}#product-grid`;
}
