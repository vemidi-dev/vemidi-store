import Image from "next/image";
import Link from "next/link";

import CategoryShowcaseCard from "@/components/category/category-showcase-card";
import { PageContainer } from "@/components/layout/page-container";
import { ProductCard } from "@/components/product/product-card";
import { products } from "@/lib/catalog";
import { shopCategories } from "@/lib/shop-categories";

export default function HomePage() {
  const featured = products.slice(0, 3);

  return (
    <div>
      <section className="border-b border-boutique-line bg-boutique-paper">
        <PageContainer className="grid items-center gap-12 py-16 md:grid-cols-[1.05fr_0.95fr] md:py-24">
          <div className="order-2 space-y-8 md:order-1">
            <div className="space-y-5">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-boutique-accent">
                Ръчна изработка · По поръчка
              </p>
              <h1 className="font-heading text-4xl leading-[1.12] tracking-tight text-boutique-ink sm:text-5xl lg:text-[3.25rem]">
                Ръчно изработени подаръци за специални моменти
              </h1>
              <p className="max-w-lg text-lg leading-relaxed text-boutique-muted">
                Персонализирани дървени изделия, пана от скандинавски мъх и уникални декорации
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/products"
                className="rounded-full bg-boutique-ink px-8 py-3.5 text-sm font-semibold tracking-wide text-boutique-paper transition hover:bg-boutique-accent"
              >
                Разгледай продуктите
              </Link>
              <Link
                href="/cart"
                className="rounded-full border border-boutique-line bg-transparent px-8 py-3.5 text-sm font-semibold tracking-wide text-boutique-ink transition hover:border-boutique-accent/40 hover:text-boutique-accent"
              >
                Количка
              </Link>
            </div>
          </div>

          <div className="order-1 md:order-2">
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl shadow-boutique md:aspect-[3/4]">
              <Image
                src="https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=1000&q=80"
                alt="Топла работилница с дърво, инструменти и естествена светлина"
                fill
                priority
                sizes="(max-width: 768px) 100vw, 45vw"
                className="object-cover"
              />
              <div className="absolute inset-0 ring-1 ring-inset ring-boutique-ink/5" />
            </div>
          </div>
        </PageContainer>
      </section>

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
              href="/products"
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
