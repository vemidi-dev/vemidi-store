import {
  buildProductBreadcrumbItems,
  resolvePrimaryProductCategory,
  type BreadcrumbItem,
} from "@/lib/seo/breadcrumbs";
import type { ProductSeoContext } from "@/lib/seo/product-description-seo";
import type { StorefrontCatalog, StorefrontCategory } from "@/lib/storefront/types";

export type ProductPageSeoResolution = {
  categorySlugs: string[];
  primaryCategory: StorefrontCategory | null;
  breadcrumbItems: BreadcrumbItem[];
  seoContext: ProductSeoContext;
};

export function resolveProductPageSeo(
  catalog: StorefrontCatalog,
  product: { id: string; title: string; slug: string },
): ProductPageSeoResolution {
  const catalogProduct = catalog.products.find((entry) => entry.id === product.id);
  const categorySlugs = catalogProduct?.categorySlugs ?? [];
  const primaryCategory = resolvePrimaryProductCategory(
    catalog.categories,
    categorySlugs,
    catalogProduct?.primaryCategoryId,
  );
  const seoContext: ProductSeoContext = {
    primaryCategory: primaryCategory
      ? { name: primaryCategory.name, slug: primaryCategory.slug }
      : null,
  };

  return {
    categorySlugs,
    primaryCategory,
    breadcrumbItems: buildProductBreadcrumbItems(catalog.categories, {
      title: product.title,
      slug: product.slug,
      categorySlugs,
      primaryCategoryId: catalogProduct?.primaryCategoryId ?? null,
    }),
    seoContext,
  };
}
