import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { PageContainer } from "@/components/layout/page-container";
import { getProductBySlug, products } from "@/lib/catalog";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  return (
    <div>
      <section className="border-b border-boutique-line bg-boutique-paper">
        <PageContainer className="py-10 md:py-12">
          <Link
            href="/products"
            className="text-xs font-semibold uppercase tracking-[0.2em] text-boutique-muted transition hover:text-boutique-accent"
          >
            ← Back to catalog
          </Link>
          <div className="mt-10 grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-start lg:gap-16">
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-boutique-line/80 shadow-boutique lg:sticky lg:top-28">
              <Image
                src={product.imageSrc}
                alt={product.imageAlt}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
              <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-boutique-ink/5" />
            </div>
            <div className="space-y-8 pb-4">
              {product.tag ? (
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-boutique-accent">
                  {product.tag}
                </p>
              ) : (
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-boutique-muted">
                  Made to order
                </p>
              )}
              <h1 className="font-heading text-4xl leading-tight tracking-tight text-boutique-ink sm:text-5xl">
                {product.title}
              </h1>
              <p className="font-heading text-3xl text-boutique-ink/90">€{product.price.toFixed(2)}</p>
              <p className="text-base leading-relaxed text-boutique-muted">{product.description}</p>
              <div className="border-t border-boutique-line pt-8">
                <AddToCartButton product={product} />
                <p className="mt-4 text-xs leading-relaxed text-boutique-muted">
                  Ships from our studio in 5–10 business days. Personalization confirmed by email.
                </p>
              </div>
            </div>
          </div>
        </PageContainer>
      </section>
    </div>
  );
}
