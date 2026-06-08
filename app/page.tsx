import Link from "next/link";

import CategoryShowcaseCard from "@/components/category/category-showcase-card";
import { HomeHero } from "@/components/home/home-hero";
import { PageContainer } from "@/components/layout/page-container";
import { ProductCard } from "@/components/product/product-card";
import { products } from "@/lib/catalog";
import { shopCategories } from "@/lib/shop-categories";

export default function HomePage() {
  const featured = products.slice(0, 3);

  return (
    <div>
      <HomeHero />

      <section className="border-b border-boutique-line bg-boutique-bg py-16 md:py-20">
        <PageContainer>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-boutique-accent">
              Категории
            </p>
            <h2 className="font-heading mt-4 text-3xl text-boutique-ink sm:text-4xl">
              Изберете повод — ние се грижим за детайла
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-boutique-muted">
              Всяка категория води към магазина с филтър, за да откриете по-бързо подходящите
              изделия.
            </p>
          </div>
          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {shopCategories.map((category) => (
              <CategoryShowcaseCard key={category.slug} category={category} />
            ))}
          </div>
        </PageContainer>
      </section>

      <section className="py-16 md:py-20">
        <PageContainer>
          <div className="text-center">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-boutique-accent">
              Избрани произведения
            </p>
            <h2 className="font-heading mt-4 text-3xl text-boutique-ink sm:text-4xl">
              Подбрано като в бутикова витрина
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-boutique-muted">
              Всяка вещ е представена с внимание към детайла — материали, текстура и усещане за
              малка, независима ателиерна линия.
            </p>
          </div>
          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 text-sm font-medium text-boutique-accent underline-offset-8 transition hover:text-boutique-ink hover:underline"
            >
              Към целия каталог
              <span aria-hidden>→</span>
            </Link>
          </div>
        </PageContainer>
      </section>
    </div>
  );
}
