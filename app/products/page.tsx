import { notFound, permanentRedirect } from "next/navigation";

import { resolveProductsPageRedirect } from "@/lib/seo/shop-route";
import {
  CATALOG_OCCASION_FILTER_PARAM,
  CATALOG_PRODUCT_CATEGORY_FILTER_PARAM,
  LEGACY_CATALOG_OCCASION_FILTER_PARAM,
  LEGACY_CATALOG_PRODUCT_CATEGORY_FILTER_PARAM,
} from "@/lib/catalog-filter-query-params";
import { filterStorefrontVisibleCategories } from "@/lib/category-visibility";
import { getStorefrontCatalog } from "@/lib/storefront/repository";

type ProductsPageProps = {
  searchParams: Promise<{
    category?: string | string[];
    product?: string | string[];
    occasion?: string | string[];
    vid?: string | string[];
    povod?: string | string[];
  }>;
};

function hasLegacyProductsQuery(
  params: Awaited<ProductsPageProps["searchParams"]>,
): boolean {
  return (
    params.category !== undefined ||
    params[CATALOG_PRODUCT_CATEGORY_FILTER_PARAM] !== undefined ||
    params[CATALOG_OCCASION_FILTER_PARAM] !== undefined ||
    params[LEGACY_CATALOG_PRODUCT_CATEGORY_FILTER_PARAM] !== undefined ||
    params[LEGACY_CATALOG_OCCASION_FILTER_PARAM] !== undefined
  );
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;

  // Bare /products: GET/HEAD -> middleware 308 to /produkti. Other methods must not redirect.
  if (!hasLegacyProductsQuery(params)) {
    notFound();
  }

  const { categories } = await getStorefrontCatalog();
  permanentRedirect(
    resolveProductsPageRedirect(
      params,
      filterStorefrontVisibleCategories(categories),
    ),
  );
}
