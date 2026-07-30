import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { ProductDetailAddToCart } from "@/components/product/product-detail-add-to-cart";
import { PRODUCT_LEFT_COLORS_SLOT_ID } from "@/components/product/product-detail-color-fields";
import { MetaPixelViewContentBridge } from "@/components/consent/meta-pixel-view-content-bridge";
import { ProductDetailGalleryAside } from "@/components/product/product-detail-content-sections";
import { FaqSection } from "@/components/faq/faq-section";
import { ProductDetailGallery } from "@/components/product/product-detail-gallery";
import { ProductServiceBlocks } from "@/components/product/product-service-blocks";
import { ProductDetailOccasionTags } from "@/components/product/product-detail-occasion-tags";
import { ProductLandingPageCta } from "@/components/product/product-landing-page-cta";
import { PageContainer } from "@/components/layout/page-container";
import { ProductPrice } from "@/components/product/product-price";
import { ProductCard } from "@/components/product/product-card";
import { JsonLd } from "@/components/seo/json-ld";
import { VisibleBreadcrumbs } from "@/components/seo/visible-breadcrumbs";
import type { Product } from "@/lib/catalog";
import type { CampaignAttribution } from "@/lib/campaign-attribution";
import { getCategoryListingHref } from "@/lib/category-url";
import type { ProductOptionSelection } from "@/lib/product-options";
import { shouldUseMaterialOptionCards } from "@/lib/product-option-layout";
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
import type { ProductUpsellOffer } from "@/lib/storefront/product-upsells";
import type { ProductPageCopy } from "@/lib/content/product-page-copy";
import {
  getPriceSummaryLabel,
  getPriceSummaryNote,
} from "@/lib/content/product-page-copy";
import type { ReadyProductCta } from "@/lib/product-ready-cta";
import { resolvePersonalizationDetailsOpen } from "@/lib/product-personalization-default";

type ProductDetailViewProps = {
  product: Product;
  breadcrumbItems: BreadcrumbItem[];
  productOccasions: StorefrontCategory[];
  primaryCategory: StorefrontCategory | null;
  showCategoryLink: boolean;
  relatedProducts: Product[];
  primaryLandingPage: ProductLandingPage | null;
  productFaqItems: FaqItem[];
  upsellOffers?: ProductUpsellOffer[];
  upsellSectionTitle?: string | null;
  attribution?: CampaignAttribution;
  initialOptionSelections?: ProductOptionSelection[];
  productSeoContext: ProductSeoContext;
  productPageCopy: ProductPageCopy;
  readyProductCta?: ReadyProductCta | null;
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
  upsellOffers = [],
  upsellSectionTitle = null,
  attribution,
  initialOptionSelections = [],
  productSeoContext,
  productPageCopy,
  readyProductCta = null,
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
  const featuredRelatedProduct = readyProductCta?.product ?? null;
  const readyProductCtaLabel = readyProductCta?.label ?? null;
  const usesMaterialStockLayout = shouldUseMaterialOptionCards(
    product,
    product.optionGroups ?? [],
  );
  const priceSummaryLabel = getPriceSummaryLabel(
    productPageCopy,
    usesMaterialStockLayout,
  );
  const priceSummaryNote = getPriceSummaryNote(
    productPageCopy,
    usesMaterialStockLayout,
  );
  const personalizationDetailsOpen = resolvePersonalizationDetailsOpen(
    product.personalizationOpenByDefault ?? null,
    usesMaterialStockLayout,
    Boolean(product.personalizationFields?.some((field) => field.required)),
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
    <div className="min-h-screen bg-boutique-bg pb-24 lg:pb-0">
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

          {usesMaterialStockLayout ? (
            <>
            <div className="mt-8 flex flex-col gap-8 lg:mt-10 lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-start lg:gap-x-16 xl:gap-x-20">
              <div className="order-1 flex min-w-0 flex-col gap-0 lg:sticky lg:top-28 lg:z-0 lg:self-start">
                <ProductDetailGallery
                  images={product.images}
                  syncKey={product.id}
                  syncOptionImages={false}
                />
                <div id={PRODUCT_LEFT_COLORS_SLOT_ID} className="hidden min-w-0 lg:block" />
                <ProductDetailGalleryAside
                  className="mt-5 hidden lg:block"
                  description={product.description}
                  personalizationInfo={product.personalizationInfo}
                  dimensionsMaterials={product.dimensionsMaterials}
                  orderingInfo={product.orderingInfo}
                  additionalInfo={product.additionalInfo}
                  showFulfillmentInfo={false}
                />
              </div>

              <div className="order-2 flex min-w-0 flex-col lg:col-start-2 lg:row-start-1">
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
                      <h2 className="mt-4 max-w-xl text-xl font-medium leading-relaxed text-boutique-ink/80 sm:text-2xl">
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

                {featuredRelatedProduct && readyProductCtaLabel ? (
                  <Link
                    href={getProductPath(featuredRelatedProduct.slug)}
                    className="mt-5 flex items-center gap-3 rounded-2xl border border-boutique-line bg-white/75 p-3 transition duration-200 ease-out hover:border-boutique-sage-deep/45 hover:shadow-boutique-sm motion-reduce:transition-none"
                  >
                    <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-boutique-line bg-boutique-bg">
                      {featuredRelatedProduct.images[0]?.src ? (
                        <Image
                          src={featuredRelatedProduct.images[0].src}
                          alt={featuredRelatedProduct.images[0].alt || featuredRelatedProduct.title}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      ) : null}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-boutique-accent">
                        {readyProductCtaLabel}
                      </span>
                      <span className="mt-1 block text-sm font-semibold leading-5 text-boutique-ink">
                        {featuredRelatedProduct.title}
                      </span>
                    </span>
                    <span
                      aria-hidden="true"
                      className="ml-auto shrink-0 text-lg text-boutique-sage-deep"
                    >
                      →
                    </span>
                  </Link>
                ) : null}

                <ProductDetailGalleryAside
                  className="mt-5 lg:hidden"
                  description={product.description}
                  personalizationInfo={product.personalizationInfo}
                  dimensionsMaterials={product.dimensionsMaterials}
                  orderingInfo={product.orderingInfo}
                  additionalInfo={product.additionalInfo}
                  showFulfillmentInfo={false}
                />

                <ProductDetailAddToCart
                  attribution={attribution}
                  initialOptionSelections={initialOptionSelections}
                  layout="embedded"
                  personalizationDetailsOpen={personalizationDetailsOpen}
                  priceSummaryLabel={priceSummaryLabel}
                  priceSummaryNote={priceSummaryNote}
                  product={product}
                  upsellOffers={upsellOffers}
                  upsellSectionTitle={upsellSectionTitle}
                  usesMaterialStockLayout
                />

                <ProductLandingPageCta landingPage={primaryLandingPage} />
              </div>
            </div>
            </>
          ) : (
          <div className="mt-8 flex flex-col gap-8 lg:mt-10 lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-start lg:gap-x-16 xl:gap-x-20">
            <div className="order-1 flex min-w-0 flex-col gap-0 lg:sticky lg:top-28 lg:self-start">
              <div className="min-w-0">
                <ProductDetailGallery
                  images={product.images}
                  syncKey={product.id}
                  syncOptionImages
                />
              </div>
              <ProductDetailGalleryAside
                className="mt-5 hidden lg:block"
                description={product.description}
                personalizationInfo={product.personalizationInfo}
                dimensionsMaterials={product.dimensionsMaterials}
                orderingInfo={product.orderingInfo}
                additionalInfo={product.additionalInfo}
                showFulfillmentInfo={false}
              />
            </div>

            <div className="order-2 flex min-w-0 flex-col lg:col-start-2 lg:row-start-1">
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
                    <h2 className="mt-4 max-w-xl text-xl font-medium leading-relaxed text-boutique-ink/80 sm:text-2xl">
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

              {featuredRelatedProduct && readyProductCtaLabel ? (
                <Link
                  href={getProductPath(featuredRelatedProduct.slug)}
                  className="mt-5 flex items-center gap-3 rounded-2xl border border-boutique-line bg-white/75 p-3 transition duration-200 ease-out hover:border-boutique-sage-deep/45 hover:shadow-boutique-sm motion-reduce:transition-none"
                >
                  <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-boutique-line bg-boutique-bg">
                    {featuredRelatedProduct.images[0]?.src ? (
                      <Image
                        src={featuredRelatedProduct.images[0].src}
                        alt={featuredRelatedProduct.images[0].alt || featuredRelatedProduct.title}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    ) : null}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-boutique-accent">
                      {readyProductCtaLabel}
                    </span>
                    <span className="mt-1 block text-sm font-semibold leading-5 text-boutique-ink">
                      {featuredRelatedProduct.title}
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className="ml-auto shrink-0 text-lg text-boutique-sage-deep"
                  >
                    →
                  </span>
                </Link>
              ) : null}

              <ProductDetailGalleryAside
                className="mt-5 lg:hidden"
                description={product.description}
                personalizationInfo={product.personalizationInfo}
                dimensionsMaterials={product.dimensionsMaterials}
                orderingInfo={product.orderingInfo}
                additionalInfo={product.additionalInfo}
                showFulfillmentInfo={false}
              />

              <ProductDetailAddToCart
                attribution={attribution}
                initialOptionSelections={initialOptionSelections}
                layout="embedded"
                personalizationDetailsOpen={personalizationDetailsOpen}
                priceSummaryLabel={priceSummaryLabel}
                priceSummaryNote={priceSummaryNote}
                product={product}
                upsellOffers={upsellOffers}
                upsellSectionTitle={upsellSectionTitle}
              />

              <ProductLandingPageCta landingPage={primaryLandingPage} />
            </div>
          </div>
          )}
          {productPageCopy.serviceBlocks.length ? (
            <ProductServiceBlocks
              blocks={productPageCopy.serviceBlocks}
              className="mt-8"
            />
          ) : null}
          {productFaqItems.length ? (
            <FaqSection
              idPrefix={`product-faq-${product.id}`}
              items={productFaqItems}
              variant="product"
            />
          ) : null}
        </PageContainer>
      </section>

      {relatedProducts.length ? (
        <section className="border-b border-boutique-line bg-boutique-bg py-8 md:py-12">
          <PageContainer>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-boutique-accent">
                  Може да харесате
                </p>
                <h2 className="mt-1.5 font-heading text-2xl text-boutique-ink md:text-3xl">
                  Вижте още продукти
                </h2>
                <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-boutique-muted">
                  Подбрахме още идеи, които се комбинират добре с този продукт.
                </p>
              </div>
              <Link
                href="/produkti"
                className="hidden text-sm font-semibold text-boutique-sage-deep underline-offset-4 hover:underline sm:inline-flex"
              >
                Вижте всички продукти
              </Link>
            </div>
            {showCategoryLink && primaryCategory ? (
              <Link
                href={getCategoryListingHref(primaryCategory)}
                className="mt-5 inline-flex w-fit items-center gap-1.5 text-sm text-boutique-muted underline-offset-4 transition hover:text-boutique-sage-deep hover:underline"
              >
                Разгледайте още от „{primaryCategory.name}“
                <span aria-hidden="true">→</span>
              </Link>
            ) : null}
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
              {relatedProducts.map((related) => (
                <ProductCard
                  key={related.id}
                  product={related}
                  variant="related"
                />
              ))}
            </div>
          </PageContainer>
        </section>
      ) : null}
    </div>
  );
}
