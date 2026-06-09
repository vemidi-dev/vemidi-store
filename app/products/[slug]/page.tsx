import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductDetailAddToCart } from "@/components/product/product-detail-add-to-cart";
import { ProductDetailGallery } from "@/components/product/product-detail-gallery";
import { PageContainer } from "@/components/layout/page-container";
import { formatEur } from "@/lib/format-eur";
import { getStorefrontProduct } from "@/lib/storefront/repository";
import { getSiteUrl } from "@/lib/site-url";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getStorefrontProduct(slug);

  if (!product) {
    return {
      title: "Продуктът не е намерен",
      robots: { index: false, follow: false },
    };
  }

  const description = product.description.slice(0, 160);
  const image = product.images.find((item) => item.src)?.src;

  return {
    title: product.title,
    description,
    alternates: { canonical: `/products/${slug}` },
    openGraph: {
      type: "website",
      title: product.title,
      description,
      url: `/products/${slug}`,
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

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getStorefrontProduct(slug);

  if (!product) {
    notFound();
  }

  const productUrl = new URL(`/products/${slug}`, getSiteUrl()).toString();
  const productImage = product.images.find((item) => item.src)?.src;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description,
    image: productImage ? [productImage] : undefined,
    url: productUrl,
    brand: {
      "@type": "Brand",
      name: "VeMiDi crafts",
    },
    offers: {
      "@type": "Offer",
      priceCurrency: "EUR",
      price: product.price.toFixed(2),
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
                {product.tag ? (
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-boutique-accent">
                    {product.tag}
                  </p>
                ) : (
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-boutique-muted">
                    В ателието
                  </p>
                )}

                <h1 className="font-heading text-4xl leading-[1.12] tracking-tight text-boutique-ink sm:text-5xl lg:text-[2.75rem]">
                  {product.title}
                </h1>

                <p className="font-heading text-3xl tracking-tight text-boutique-ink/90 sm:text-4xl">
                  {formatEur(product.price)}
                </p>
              </div>

              <p className="mt-12 max-w-xl text-lg leading-[1.75] text-boutique-muted md:text-xl md:leading-[1.8]">
                {product.description}
              </p>
              {product.additionalInfo ? (
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-boutique-muted">
                  {product.additionalInfo}
                </p>
              ) : null}

              <ProductDetailAddToCart product={product} />

              <p className="mt-14 max-w-lg text-sm leading-relaxed text-boutique-muted md:mt-16">
                {product.fulfillmentNote ??
                  "Изпращане от ателието за 5-10 работни дни. При персонализация ще потвърдим текста по имейл преди изработка."}
              </p>
            </div>
          </div>
        </PageContainer>
      </section>
    </div>
  );
}
