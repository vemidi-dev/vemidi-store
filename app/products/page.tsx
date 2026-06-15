import { notFound, permanentRedirect } from "next/navigation";

import { resolveProductsPageRedirect } from "@/lib/seo/shop-route";
import { getStorefrontCatalog } from "@/lib/storefront/repository";

type ProductsPageProps = {
  searchParams: Promise<{
    category?: string | string[];
    product?: string | string[];
    occasion?: string | string[];
  }>;
};

function hasLegacyProductsQuery(
  params: Awaited<ProductsPageProps["searchParams"]>,
): boolean {
  return (
    params.category !== undefined ||
    params.product !== undefined ||
    params.occasion !== undefined
  );
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;

  // Bare /products: GET/HEAD → middleware 308 to /shop. Other methods must not redirect.
  if (!hasLegacyProductsQuery(params)) {
    notFound();
  }

  const { categories } = await getStorefrontCatalog();
  permanentRedirect(resolveProductsPageRedirect(params, categories));
}
