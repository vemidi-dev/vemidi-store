import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";
import { ProductCard } from "@/components/product/product-card";
import { PageHero } from "@/components/ui/page-hero";
import { products } from "@/lib/catalog";
import { shopCategories } from "@/lib/shop-categories";

const categoryLabelBySlug = Object.fromEntries(
  shopCategories.map((c) => [c.slug, c.title]),
) as Record<string, string>;

type ProductsPageProps = {
  searchParams: Promise<{ category?: string | string[] }>;
};

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const raw = params.category;
  const categorySlug = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  const activeLabel =
    categorySlug && categoryLabelBySlug[categorySlug] ? categoryLabelBySlug[categorySlug] : null;

  return (
    <div>
      <PageHero
        eyebrow="Ателиер"
        title="Магазин"
        description="Демо каталог с внимание към материала и формата. Скоре тук ще се връзват реални данни от Supabase или CMS."
      />

      <section className="pb-20 pt-4 md:pb-28">
        <PageContainer>
          {activeLabel ? (
            <div className="mb-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-boutique-accent/20 bg-boutique-warm/40 px-5 py-4">
              <p className="text-sm text-boutique-ink">
                <span className="text-boutique-muted">Категория: </span>
                <span className="font-semibold">{activeLabel}</span>
              </p>
              <Link
                href="/products"
                className="text-xs font-semibold uppercase tracking-wider text-boutique-accent underline-offset-4 transition hover:text-boutique-ink hover:underline"
              >
                Изчисти филтъра
              </Link>
            </div>
          ) : null}

          <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-2">
            {products.map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </div>
        </PageContainer>
      </section>
    </div>
  );
}
