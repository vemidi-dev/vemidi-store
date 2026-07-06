import { getCategoryListingHref } from "@/lib/category-url";
import type { BlogPostRow } from "@/lib/admin/types";
import type {
  StorefrontCatalog,
  StorefrontCategory,
  StorefrontProduct,
} from "@/lib/storefront/types";

export type BlogRecommendation = {
  category: StorefrontCategory | null;
  href: string | null;
  linkLabel: string | null;
  products: StorefrontProduct[];
};

export function resolveBlogRecommendation(
  post: Pick<BlogPostRow, "cta_category_id" | "cta_link_label">,
  catalog: Pick<StorefrontCatalog, "categories" | "products">,
  selectedProductIds: string[] = [],
): BlogRecommendation | null {
  const linkLabel = post.cta_link_label?.trim();
  const category = post.cta_category_id
    ? catalog.categories.find((candidate) => candidate.id === post.cta_category_id) ??
      null
    : null;
  const productById = new Map(catalog.products.map((product) => [product.id, product]));
  const products = selectedProductIds
    .map((productId) => productById.get(productId) ?? null)
    .filter((product): product is StorefrontProduct => product !== null);

  if (!products.length && !linkLabel && !category) return null;

  return {
    category,
    href: category ? getCategoryListingHref(category) : null,
    linkLabel: linkLabel ?? null,
    products,
  };
}
