import { permanentRedirect } from "next/navigation";

import { resolveProductsPageRedirect } from "@/lib/seo/shop-route";
import { getStorefrontCatalog } from "@/lib/storefront/repository";

type ProductsPageProps = {
  searchParams: Promise<{
    category?: string | string[];
    product?: string | string[];
    occasion?: string | string[];
  }>;
};

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const { categories } = await getStorefrontCatalog();
  permanentRedirect(resolveProductsPageRedirect(params, categories));
}
