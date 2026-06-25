import Link from "next/link";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { ProductDetailAddToCart } from "@/components/product/product-detail-add-to-cart";
import { ProductDetailInfoZone } from "@/components/product/product-detail-content-sections";
import { ProductDetailGallery } from "@/components/product/product-detail-gallery";
import { ProductDetailOccasionTags } from "@/components/product/product-detail-occasion-tags";
import { ProductLandingPageCta } from "@/components/product/product-landing-page-cta";
import { PageContainer } from "@/components/layout/page-container";
import { ProductPrice } from "@/components/product/product-price";
import { ProductCard } from "@/components/product/product-card";
import { JsonLd } from "@/components/seo/json-ld";
import { VisibleBreadcrumbs } from "@/components/seo/visible-breadcrumbs";
import { isProductOnPromotion } from "@/lib/product-pricing";
import { getCategoryPath } from "@/lib/category-url";
import { filterStorefrontVisibleCategories } from "@/lib/category-visibility";
import {
  getStorefrontCatalog,
  getStorefrontProductPage,
  getStorefrontProductSeoContext,
} from "@/lib/storefront/repository";
import { getPrimaryActiveProductLandingPage } from "@/lib/product-landing/repository";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";
import { buildCampaignAttribution } from "@/lib/campaign-attribution";
import { getCampaignProductPageOptionSelections } from "@/lib/campaign-handoff";
import {
  buildCanonicalProductRedirectPath,
  getProductPath,
} from "@/lib/product-url";
import {
  getProductCategorySlugs,
  isProductCategoryIndexable,
} from "@/lib/seo/category-indexability";
import { resolveSchemaOrgProductAvailability } from "@/lib/seo/product-schema-availability";
import { buildBreadcrumbListSchema } from "@/lib/seo/breadcrumbs";
import { buildProductSchemaDescription } from "@/lib/seo/product-description-seo";
import { resolveProductPageSeo } from "@/lib/seo/product-page-seo";
import { buildProductPageMetadata } from "@/lib/seo/product-metadata";

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
  const primaryLandingPage = supabase
    ? await getPrimaryActiveProductLandingPage(supabase, product.id)
    : null;
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
  const productUrl = new URL(
    getProductPath(product.slug),
    getSiteUrl(),
  ).toString();
  const productById = new Map(
    catalog.products.map((catalogProduct) => [
      catalogProduct.id,
      catalogProduct,
    ]),
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
  const productImage = product.images.find((item) => item.src)?.src;
  const onPromotion = isProductOnPromotion(product);
  const schemaAvailability = resolveSchemaOrgProductAvailability({
    soldOut: product.soldOut,
    fulfillmentType: product.fulfillmentType,
    stockQuantity:
      product.fulfillmentType === "stocked"
        ? (product.maxCartQuantity ?? (product.orderable ? 1 : 0))
        : null,
  });
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
  const schemaDescription = buildProductSchemaDescription(
    product,
    productSeoContext,
  );
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: schemaDescription,
    image: productImage ? [productImage] : undefined,
    url: productUrl,
    sku: product.productCode,
    brand: {
      "@type": "Brand",
      name: "VeMiDi crafts",
    },
    offers: {
      "@type": "Offer",
      priceCurrency: "EUR",
      price: product.price.toFixed(2),
      ...(onPromotion && product.compareAtPrice != null
        ? { priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: product.price.toFixed(2),
            priceCurrency: "EUR",
          } }
        : {}),
      ...(product.promotion?.endsAt
        ? { priceValidUntil: product.promotion.endsAt }
        : {}),
      url: productUrl,
      availability: schemaAvailability,
      itemCondition: "https://schema.org/NewCondition",
    },
  };

  const breadcrumbSchema = buildBreadcrumbListSchema(
    breadcrumbItems,
    getSiteUrl(),
  );

  return (
    <div className="min-h-screen bg-boutique-bg">
      <JsonLd data={[structuredData, breadcrumbSchema]} />
      <section className="border-b border-boutique-line/90 bg-boutique-paper">
        <PageContainer className="py-10 md:py-14 lg:py-16">
          <VisibleBreadcrumbs items={breadcrumbItems} />

          <div className="mt-8 flex flex-col gap-8 lg:mt-10 lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-start lg:gap-x-16 xl:gap-x-20">
            <div className="min-w-0 lg:col-start-1 lg:row-start-1">
              <ProductDetailGallery images={product.images} />
            </div>

            <div className="flex min-w-0 flex-col lg:col-start-2 lg:row-start-1">
              <div className="space-y-6">
                {product.cardBadge ? (
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-boutique-accent">
                    {product.cardBadge}
                  </p>
                ) : null}

                <div>
                  <h1 className="font-heading text-4xl leading-[1.12] tracking-tight text-boutique-ink sm:text-5xl lg:text-[2.75rem]">
                    {product.title}
                  </h1>

                  {product.subtitle ? (
                    <p className="mt-4 max-w-xl text-base leading-relaxed text-boutique-muted md:text-lg md:leading-8">
                      {product.subtitle}
                    </p>
                  ) : null}
                </div>

                <ProductDetailOccasionTags occasions={productOccasions} />

                <div className="flex flex-wrap items-center gap-3">
                  <ProductPrice product={product} size="lg" />
                  {product.promotion ? (
                    <span className="rounded-full bg-boutique-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-boutique-accent">
                      {product.promotion.label}
                    </span>
                  ) : null}
                  {product.availabilityLabel !== "В наличност" ? (
                    <span className="rounded-full border border-boutique-line bg-boutique-muted/10 px-2.5 py-0.5 text-[0.68rem] font-semibold tracking-[0.06em] text-boutique-muted">
                      {product.fulfillmentType === "made_to_order"
                        ? "По поръчка"
                        : product.availabilityLabel}
                    </span>
                  ) : null}
                </div>
              </div>

              {showCategoryLink ? (
                <Link
                  href={getCategoryPath(primaryCategory.slug)}
                  className="mt-5 inline-flex w-fit items-center gap-2 text-sm font-semibold text-boutique-sage-deep underline-offset-4 transition hover:text-boutique-ink hover:underline"
                >
                  Разгледайте още от „{primaryCategory.name}“
                  <span aria-hidden="true">→</span>
                </Link>
              ) : null}

              <ProductDetailAddToCart
                attribution={attribution}
                initialOptionSelections={initialOptionSelections}
                layout="embedded"
                product={product}
              />

              <ProductLandingPageCta landingPage={primaryLandingPage} />
            </div>
          </div>
        </PageContainer>
      </section>

      <ProductDetailInfoZone
        description={product.description}
        personalizationInfo={product.personalizationInfo}
        dimensionsMaterials={product.dimensionsMaterials}
        orderingInfo={product.orderingInfo}
        additionalInfo={product.additionalInfo}
      />

      {relatedProducts.length ? (
        <section className="border-b border-boutique-line bg-boutique-bg py-10 md:py-16">
          <PageContainer>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-boutique-accent">
                  Още идеи
                </p>
                <h2 className="mt-2 font-heading text-3xl text-boutique-ink">
                  Може да ви харесат
                </h2>
              </div>
              <Link
                href="/producti"
                className="hidden text-sm font-semibold text-boutique-sage-deep underline-offset-4 hover:underline sm:inline-flex"
              >
                Виж всички
              </Link>
            </div>
            <div className="mt-7 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
              {relatedProducts.map((related) => (
                <ProductCard
                  key={related.id}
                  product={related}
                  variant="catalog"
                />
              ))}
            </div>
          </PageContainer>
        </section>
      ) : null}
    </div>
  );
}
