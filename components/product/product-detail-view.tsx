import Link from "next/link";
import type { ReactNode } from "react";

import { ProductDetailAddToCart } from "@/components/product/product-detail-add-to-cart";
import { MetaPixelViewContentBridge } from "@/components/consent/meta-pixel-view-content-bridge";
import { ProductDetailGalleryAside } from "@/components/product/product-detail-content-sections";
import { ProductDetailGallery } from "@/components/product/product-detail-gallery";
import { ProductDetailOccasionTags } from "@/components/product/product-detail-occasion-tags";
import { ProductLandingPageCta } from "@/components/product/product-landing-page-cta";
import { PageContainer } from "@/components/layout/page-container";
import { ProductPrice } from "@/components/product/product-price";
import { ProductCard } from "@/components/product/product-card";
import { JsonLd } from "@/components/seo/json-ld";
import { VisibleBreadcrumbs } from "@/components/seo/visible-breadcrumbs";
import type { Product } from "@/lib/catalog";
import type { CampaignAttribution } from "@/lib/campaign-attribution";
import { getCategoryPath } from "@/lib/category-url";
import type { ProductOptionSelection } from "@/lib/product-options";
import type { StorefrontCategory } from "@/lib/storefront/types";
import { isProductOnPromotion } from "@/lib/product-pricing";
import type { ProductLandingPage } from "@/lib/product-landing/types";
import type { FaqItem } from "@/lib/faq/types";
import { getSiteUrl } from "@/lib/site-url";
import { getProductPath } from "@/lib/product-url";
import { resolveSchemaOrgProductAvailability } from "@/lib/seo/product-schema-availability";
import { buildBreadcrumbListSchema, type BreadcrumbItem } from "@/lib/seo/breadcrumbs";
import { buildProductSchemaDescription } from "@/lib/seo/product-description-seo";
import type { ProductSeoContext } from "@/lib/seo/product-description-seo";

type ProductDetailViewProps = {
  product: Product;
  breadcrumbItems: BreadcrumbItem[];
  productOccasions: StorefrontCategory[];
  primaryCategory: StorefrontCategory | null;
  showCategoryLink: boolean;
  relatedProducts: Product[];
  primaryLandingPage: ProductLandingPage | null;
  productFaqItems: FaqItem[];
  attribution?: CampaignAttribution;
  initialOptionSelections?: ProductOptionSelection[];
  productSeoContext: ProductSeoContext;
  previewBanner?: ReactNode;
  includeStructuredData?: boolean;
};

export function ProductDetailView({
  product,
  breadcrumbItems,
  productOccasions,
  primaryCategory,
  showCategoryLink,
  relatedProducts,
  primaryLandingPage,
  productFaqItems,
  attribution,
  initialOptionSelections = [],
  productSeoContext,
  previewBanner,
  includeStructuredData = true,
}: ProductDetailViewProps) {
  const productUrl = new URL(getProductPath(product.slug), getSiteUrl()).toString();
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
  const schemaDescription = buildProductSchemaDescription(product, productSeoContext);
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
        ? {
            priceSpecification: {
              "@type": "UnitPriceSpecification",
              price: product.price.toFixed(2),
              priceCurrency: "EUR",
            },
          }
        : {}),
      ...(product.promotion?.endsAt
        ? { priceValidUntil: product.promotion.endsAt }
        : {}),
      url: productUrl,
      availability: schemaAvailability,
      itemCondition: "https://schema.org/NewCondition",
    },
  };
  const breadcrumbSchema = buildBreadcrumbListSchema(breadcrumbItems, getSiteUrl());

  return (
    <div className="min-h-screen bg-boutique-bg">
      {previewBanner}
      {includeStructuredData ? (
        <JsonLd data={[structuredData, breadcrumbSchema]} />
      ) : null}
      {!previewBanner ? (
        <MetaPixelViewContentBridge
          slug={product.slug}
          title={product.title}
          price={product.price}
        />
      ) : null}
      <section className="border-b border-boutique-line/90 bg-boutique-paper">
        <PageContainer className="py-10 md:py-14 lg:py-16">
          <VisibleBreadcrumbs items={breadcrumbItems} />

          <div className="mt-8 flex flex-col gap-8 lg:mt-10 lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-start lg:gap-x-16 xl:gap-x-20">
            <div className="order-1 min-w-0 lg:col-start-1 lg:row-start-1">
              <ProductDetailGallery images={product.images} />
            </div>

            <div className="order-2 flex min-w-0 flex-col lg:col-start-2 lg:row-start-1 lg:row-span-2">
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
                  {product.headingSubtitle ? (
                    <h2 className="mt-3 max-w-xl font-heading text-2xl leading-snug tracking-tight text-boutique-ink sm:text-3xl">
                      {product.headingSubtitle}
                    </h2>
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

                {product.subtitle ? (
                  <p className="max-w-xl text-base leading-relaxed text-boutique-muted md:text-lg">
                    {product.subtitle}
                  </p>
                ) : null}
              </div>

              {showCategoryLink && primaryCategory ? (
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

            <ProductDetailGalleryAside
              className="order-3 lg:col-start-1 lg:row-start-2"
              description={product.description}
              personalizationInfo={product.personalizationInfo}
              dimensionsMaterials={product.dimensionsMaterials}
              orderingInfo={product.orderingInfo}
              additionalInfo={product.additionalInfo}
              faqIdPrefix={`product-faq-${product.id}`}
              faqItems={productFaqItems}
            />
          </div>
        </PageContainer>
      </section>

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
                href="/produkti"
                className="hidden text-sm font-semibold text-boutique-sage-deep underline-offset-4 hover:underline sm:inline-flex"
              >
                Вижте всички
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
