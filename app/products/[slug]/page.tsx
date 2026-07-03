import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { ProductDetailView } from "@/components/product/product-detail-view";
import { buildCampaignAttribution } from "@/lib/campaign-attribution";
import { getCampaignProductPageOptionSelections } from "@/lib/campaign-handoff";
import { filterStorefrontVisibleCategories } from "@/lib/category-visibility";
import { getProductFaqItems } from "@/lib/faq/repository";
import { getPrimaryActiveProductLandingPage } from "@/lib/product-landing/repository";
import { getActiveProductUpsellOffers } from "@/lib/storefront/product-upsells";
import {
  buildCanonicalProductRedirectPath,
} from "@/lib/product-url";
import {
  getProductCategorySlugs,
  isProductCategoryIndexable,
} from "@/lib/seo/category-indexability";
import { buildProductPageMetadata } from "@/lib/seo/product-metadata";
import { resolveProductPageSeo } from "@/lib/seo/product-page-seo";
import { createClient } from "@/lib/supabase/server";
import {
  getStorefrontCatalog,
  getStorefrontProductPage,
  getStorefrontProductSeoContext,
} from "@/lib/storefront/repository";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const resolution = await getStorefrontProductPage(slug);

  if (resolution.kind === "redirect") {
    return {
      robots: { index: false, follow: false },
    };
  }

  if (resolution.kind === "not_found") {
    notFound();
  }

  const seoContextData = await getStorefrontProductSeoContext(resolution.product.id);

  return buildProductPageMetadata(
    resolution.product,
    resolution.canonicalSlug,
    {
      primaryCategory: seoContextData.primaryCategory
        ? {
            name: seoContextData.primaryCategory.name,
            slug: seoContextData.primaryCategory.slug,
          }
        : null,
    },
  );
}

export default async function ProductDetailPage({
  params,
  searchParams,
}: ProductPageProps) {
  const { slug } = await params;
  const query = searchParams ? await searchParams : {};
  const resolution = await getStorefrontProductPage(slug);

  if (resolution.kind === "redirect") {
    permanentRedirect(
      buildCanonicalProductRedirectPath(resolution.targetSlug, query),
    );
  }

  if (resolution.kind === "not_found") {
    notFound();
  }

  const product = resolution.product;
  const supabase = await createClient();
  const [primaryLandingPage, productFaqItems, upsellOffers] = await Promise.all([
    supabase ? getPrimaryActiveProductLandingPage(supabase, product.id) : null,
    getProductFaqItems(product.id, supabase),
    supabase ? getActiveProductUpsellOffers(supabase, product.id) : [],
  ]);
  const attribution = buildCampaignAttribution({
    campaign: Array.isArray(query.campaign) ? query.campaign[0] : query.campaign,
    source: Array.isArray(query.source) ? query.source[0] : query.source,
    landingUrl: Array.isArray(query.landing) ? query.landing[0] : query.landing,
  });
  const catalog = await getStorefrontCatalog();
  const initialOptionSelections = getCampaignProductPageOptionSelections(
    product,
    query,
  );
  const productById = new Map(
    catalog.products.map((catalogProduct) => [catalogProduct.id, catalogProduct]),
  );
  const relatedProducts = (
    catalog.relatedProductIdsByProductId.get(product.id) ?? []
  )
    .map((productId) => productById.get(productId))
    .filter(
      (related): related is (typeof catalog.products)[number] =>
        Boolean(related),
    )
    .slice(0, 4);
  const {
    primaryCategory,
    breadcrumbItems,
    seoContext: productSeoContext,
    categorySlugs: productCategorySlugsFromCatalog,
  } = resolveProductPageSeo(catalog, product);
  const productCategorySlugs = getProductCategorySlugs(catalog.products);
  const showCategoryLink =
    primaryCategory &&
    isProductCategoryIndexable(
      catalog.categories,
      productCategorySlugs,
      primaryCategory,
    );
  const productOccasionSlugs = new Set(productCategorySlugsFromCatalog);
  const productOccasions = filterStorefrontVisibleCategories(catalog.categories)
    .filter(
      (category) =>
        category.category_type === "occasion" &&
        productOccasionSlugs.has(category.slug),
    )
    .sort((left, right) => left.name.localeCompare(right.name, "bg"));

  return (
    <ProductDetailView
      product={product}
      breadcrumbItems={breadcrumbItems}
      productOccasions={productOccasions}
      primaryCategory={primaryCategory}
      showCategoryLink={Boolean(showCategoryLink)}
      relatedProducts={relatedProducts}
      primaryLandingPage={primaryLandingPage}
      productFaqItems={productFaqItems}
      upsellOffers={upsellOffers}
      attribution={attribution}
      initialOptionSelections={initialOptionSelections}
      productSeoContext={productSeoContext}
    />
  );
}
