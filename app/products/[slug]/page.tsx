import Link from "next/link";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { ProductDetailAddToCart } from "@/components/product/product-detail-add-to-cart";
import { ProductDetailGallery } from "@/components/product/product-detail-gallery";
import { ProductLandingPageCta } from "@/components/product/product-landing-page-cta";
import { PageContainer } from "@/components/layout/page-container";
import { ProductPrice } from "@/components/product/product-price";
import { ProductCard } from "@/components/product/product-card";
import { JsonLd } from "@/components/seo/json-ld";
import { VisibleBreadcrumbs } from "@/components/seo/visible-breadcrumbs";
import { isProductOnPromotion } from "@/lib/product-pricing";
import { getCategoryPath } from "@/lib/category-url";
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
import { withPlainTextClass } from "@/lib/plain-text";

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
  } = resolveProductPageSeo(catalog, product);
  const productCategorySlugs = getProductCategorySlugs(catalog.products);
  const showCategoryLink =
    primaryCategory &&
    isProductCategoryIndexable(
      catalog.categories,
      productCategorySlugs,
      primaryCategory,
    );
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
        <PageContainer className="py-14 md:py-20 lg:py-24">
          <VisibleBreadcrumbs items={breadcrumbItems} />

          <div className="mt-14 grid gap-16 lg:mt-20 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-20 xl:gap-24">
            <div className="lg:sticky lg:top-32 lg:self-start">
              <ProductDetailGallery images={product.images} />
            </div>

            <div className="flex flex-col pb-6 lg:py-4">
              <div className="space-y-6">
                {product.cardBadge ? (
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-boutique-accent">
                    {product.cardBadge}
                  </p>
                ) : null}

                <h1 className="font-heading text-4xl leading-[1.12] tracking-tight text-boutique-ink sm:text-5xl lg:text-[2.75rem]">
                  {product.title}
                </h1>

                {product.subtitle ? (
                  <h2 className="max-w-xl font-heading text-2xl leading-snug text-boutique-muted sm:text-3xl">
                    {product.subtitle}
                  </h2>
                ) : null}

                {showCategoryLink ? (
                  <p className="text-sm text-boutique-muted">
                    Категория:{" "}
                    <Link
                      href={getCategoryPath(primaryCategory.slug)}
                      className="font-semibold text-boutique-sage-deep underline-offset-4 hover:underline"
                    >
                      {primaryCategory.name}
                    </Link>
                  </p>
                ) : null}

                <div className="flex flex-wrap items-center gap-3">
                  <ProductPrice product={product} size="lg" />
                  {product.promotion ? (
                    <span className="rounded-full bg-boutique-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-boutique-accent">
                      {product.promotion.label}
                    </span>
                  ) : null}
                  {product.availabilityLabel !== "В наличност" ? (
                    <span className="rounded-full bg-boutique-muted/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-boutique-muted">
                      {product.availabilityLabel}
                    </span>
                  ) : null}
                </div>

              </div>

              {product.description ? (
                <p className={withPlainTextClass("mt-7 max-w-xl text-lg leading-[1.75] text-boutique-muted md:text-xl md:leading-[1.8]")}>
                  {product.description}
                </p>
              ) : null}
              {product.additionalInfo ? (
                <p className={withPlainTextClass("mt-4 max-w-xl text-sm leading-relaxed text-boutique-muted")}>
                  {product.additionalInfo}
                </p>
              ) : null}

              <ProductLandingPageCta landingPage={primaryLandingPage} />

              <ProductDetailAddToCart
                attribution={attribution}
                initialOptionSelections={initialOptionSelections}
                product={product}
              />

              <div className="mt-6 divide-y divide-boutique-line rounded-2xl border border-boutique-line bg-boutique-bg/70 text-sm shadow-sm">
                <div className="grid gap-1 px-5 py-4 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-5">
                  <p className="font-semibold text-boutique-ink">Изработка</p>
                  <p className="leading-6 text-boutique-muted">
                    1–5 работни дни в зависимост от натоварването. Ако ви е нужен друг срок,
                    <Link
                      href="/kontakti"
                      className="ml-1 font-semibold text-boutique-sage-deep underline-offset-4 hover:underline"
                    >
                      свържете се с нас
                    </Link>
                    .
                  </p>
                </div>
                <div className="grid gap-1 px-5 py-4 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-5">
                  <p className="font-semibold text-boutique-ink">Доставка</p>
                  <p className="leading-6 text-boutique-muted">
                    Еконт или Спиди · наложен платеж.
                    <Link
                      href="/delivery"
                      className="ml-1 font-semibold text-boutique-sage-deep underline-offset-4 hover:underline"
                    >
                      Виж условията
                    </Link>
                  </p>
                </div>
                <div className="grid gap-1 px-5 py-4 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-5">
                  <p className="font-semibold text-boutique-ink">Връщане</p>
                  <p className="leading-6 text-boutique-muted">
                    14 дни за неперсонализирани продукти.
                    <Link
                      href="/returns"
                      className="ml-1 font-semibold text-boutique-sage-deep underline-offset-4 hover:underline"
                    >
                      Условия за връщане
                    </Link>
                  </p>
                </div>
              </div>
            </div>
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
