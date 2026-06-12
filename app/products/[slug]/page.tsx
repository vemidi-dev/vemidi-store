import Link from "next/link";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { ProductDetailAddToCart } from "@/components/product/product-detail-add-to-cart";
import { ProductDetailGallery } from "@/components/product/product-detail-gallery";
import { PageContainer } from "@/components/layout/page-container";
import { ProductPrice } from "@/components/product/product-price";
import { ProductCard } from "@/components/product/product-card";
import { isProductOnPromotion } from "@/lib/product-pricing";
import {
  getStorefrontCatalog,
  getStorefrontProductPage,
} from "@/lib/storefront/repository";
import { getSiteUrl } from "@/lib/site-url";
import { buildCampaignAttribution } from "@/lib/campaign-attribution";
import { getCampaignProductPageOptionSelections } from "@/lib/campaign-handoff";
import {
  buildCanonicalProductRedirectPath,
  getProductPath,
} from "@/lib/product-url";

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
    return {
      title: "Продуктът не е намерен",
      robots: { index: false, follow: false },
    };
  }

  const product = resolution.product;
  const description = product.description.slice(0, 160);
  const image = product.images.find((item) => item.src)?.src;
  const canonicalPath = getProductPath(resolution.canonicalSlug);

  return {
    title: product.title,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      type: "website",
      title: product.title,
      description,
      url: canonicalPath,
      images: image ? [{ url: image, alt: product.title }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: product.title,
      description,
      images: image ? [image] : undefined,
    },
  };
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
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description,
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
      availability: "https://schema.org/PreOrder",
      itemCondition: "https://schema.org/NewCondition",
    },
  };

  return (
    <div className="min-h-screen bg-boutique-bg">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <section className="border-b border-boutique-line/90 bg-boutique-paper">
        <PageContainer className="py-14 md:py-20 lg:py-24">
          <Link
            href="/shop"
            className="inline-block text-xs font-semibold uppercase tracking-[0.22em] text-boutique-muted transition hover:text-boutique-accent"
          >
            ← Назад към магазина
          </Link>

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

                <div className="flex flex-wrap items-center gap-3">
                  <ProductPrice product={product} size="lg" />
                  {product.soldOut ? (
                    <span className="rounded-full bg-boutique-muted/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-boutique-muted">
                      Изчерпан
                    </span>
                  ) : product.promotion ? (
                    <span className="rounded-full bg-boutique-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-boutique-accent">
                      {product.promotion.label}
                    </span>
                  ) : null}
                </div>
              </div>

              <p className="mt-12 max-w-xl text-lg leading-[1.75] text-boutique-muted md:text-xl md:leading-[1.8]">
                {product.description}
              </p>
              {product.additionalInfo ? (
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-boutique-muted">
                  {product.additionalInfo}
                </p>
              ) : null}

              <ProductDetailAddToCart
                attribution={attribution}
                initialOptionSelections={initialOptionSelections}
                product={product}
              />

              <div className="mt-14 grid gap-3 md:mt-16">
                <article className="rounded-2xl border border-boutique-line bg-boutique-bg p-5">
                  <h2 className="font-heading text-xl text-boutique-ink">
                    Изработка и срок
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-boutique-muted">
                    {product.fulfillmentNote ??
                      "Изпращане от ателието за 5-10 работни дни. При персонализация ще потвърдим текста преди изработка."}
                  </p>
                </article>
                <article className="rounded-2xl border border-boutique-line bg-boutique-bg p-5">
                  <h2 className="font-heading text-xl text-boutique-ink">
                    Ръчно изработен продукт
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-boutique-muted">
                    Всеки продукт се изработва индивидуално. Възможни са малки разлики в
                    цветовете, текстурата и разположението на детайлите, които правят изделието
                    уникално.
                  </p>
                </article>
                <article className="rounded-2xl border border-boutique-line bg-boutique-bg p-5">
                  <h2 className="font-heading text-xl text-boutique-ink">
                    Имате въпрос преди поръчка?
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-boutique-muted">
                    Пишете ни за възможностите за персонализация, цветовете или срока за
                    конкретен повод.
                  </p>
                  <Link
                    href="/contact"
                    className="mt-4 inline-flex text-sm font-semibold text-boutique-accent underline-offset-4 hover:underline"
                  >
                    Свържете се с нас
                  </Link>
                </article>
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
                href="/shop"
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
