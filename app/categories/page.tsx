import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";
import { MediaPlaceholder } from "@/components/ui/media-placeholder";
import {
  DEFAULT_CATEGORY_CARD_DESCRIPTION,
  type ShopCategory,
} from "@/lib/shop-categories";
import { toShowcaseCategory } from "@/lib/storefront/mappers";
import { getStorefrontCatalog } from "@/lib/storefront/repository";

export const metadata: Metadata = {
  title: "Категории",
  description:
    "Разгледайте ръчно изработените подаръци на VeMiDi по вид продукт и по повод.",
  alternates: { canonical: "/categories" },
};

type CategoryWithCount = ShopCategory & {
  productCount: number;
};

function getCategoryHref(category: ShopCategory) {
  const filterName = category.categoryType === "occasion" ? "occasion" : "product";
  return `/shop?${filterName}=${encodeURIComponent(category.slug)}#product-grid`;
}

function getProductLabel(count: number) {
  return count === 1 ? "1 продукт" : `${count} продукта`;
}

function ProductCategoryCard({ category }: { category: CategoryWithCount }) {
  return (
    <Link
      href={getCategoryHref(category)}
      className="group overflow-hidden rounded-2xl border border-boutique-line bg-white shadow-boutique-sm transition duration-300 hover:-translate-y-1 hover:border-boutique-sage/50 hover:shadow-boutique"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-boutique-paper">
        {category.imageSrc ? (
          <Image
            src={category.imageSrc}
            alt={category.imageAlt}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <MediaPlaceholder label="Снимка на категорията" />
        )}
        <span className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full border border-boutique-line bg-white/90 font-heading text-lg text-boutique-sage-deep shadow-sm">
          {category.title.slice(0, 1)}
        </span>
      </div>

      <div className="p-5">
        <h2 className="font-heading text-2xl leading-tight text-boutique-ink">
          {category.title}
        </h2>
        {category.productCount > 0 ? (
          <p className="mt-1 text-xs font-medium text-boutique-sage-deep">
            {getProductLabel(category.productCount)}
          </p>
        ) : null}
        <p className="mt-3 min-h-10 text-sm leading-5 text-boutique-muted">
          {category.cardDescription?.trim() || DEFAULT_CATEGORY_CARD_DESCRIPTION}
        </p>
        <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-boutique-sage-deep">
          Разгледай
          <span aria-hidden className="transition group-hover:translate-x-1">
            →
          </span>
        </span>
      </div>
    </Link>
  );
}

function OccasionCategoryLink({ category }: { category: CategoryWithCount }) {
  return (
    <Link
      href={getCategoryHref(category)}
      className="group flex min-w-[13.5rem] items-center gap-3 rounded-xl border border-boutique-line bg-white px-4 py-3 transition hover:border-boutique-rose-deep/35 hover:bg-boutique-blush/35"
    >
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-boutique-line bg-boutique-paper">
        {category.imageSrc ? (
          <Image
            src={category.imageSrc}
            alt={category.imageAlt}
            fill
            sizes="48px"
            className="object-cover transition duration-300 group-hover:scale-110"
          />
        ) : (
          <span className="grid h-full w-full place-items-center font-heading text-lg text-boutique-sage-deep">
            {category.title.slice(0, 1)}
          </span>
        )}
      </div>
      <div>
        <p className="font-heading text-lg leading-tight text-boutique-ink">{category.title}</p>
        {category.productCount > 0 ? (
          <p className="mt-1 text-xs text-boutique-muted">
            {getProductLabel(category.productCount)}
          </p>
        ) : (
          <p className="mt-1 text-xs text-boutique-muted">Разгледай идеи</p>
        )}
      </div>
    </Link>
  );
}

export default async function CategoriesPage() {
  const { categories, products } = await getStorefrontCatalog();
  const counts = new Map<string, number>();

  products.forEach((product) => {
    product.categorySlugs.forEach((slug) => {
      counts.set(slug, (counts.get(slug) ?? 0) + 1);
    });
  });

  const withCounts = categories.map(
    (category): CategoryWithCount => ({
      ...toShowcaseCategory(category),
      productCount: counts.get(category.slug) ?? 0,
    }),
  );
  const productCategories = withCounts.filter(
    (category) => category.categoryType === "product",
  );
  const occasionCategories = withCounts.filter(
    (category) => category.categoryType === "occasion",
  );

  return (
    <div>
      <section className="overflow-hidden border-b border-boutique-line bg-boutique-paper">
        <div className="grid min-h-[19rem] lg:grid-cols-[0.8fr_1.2fr]">
          <PageContainer className="flex items-center py-12 lg:pr-12">
            <div className="max-w-xl">
              <p className="text-sm text-boutique-muted">
                <Link href="/" className="transition hover:text-boutique-sage-deep">
                  Начало
                </Link>
                <span className="mx-2" aria-hidden>
                  ›
                </span>
                Категории
              </p>
              <h1 className="mt-5 font-heading text-5xl text-boutique-ink sm:text-6xl">
                Категории
              </h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-boutique-muted">
                Разгледайте нашите продукти, групирани по видове, за да намерите лесно
                ръчно изработения подарък, който търсите.
              </p>
            </div>
          </PageContainer>
          <div className="relative min-h-64 lg:min-h-full">
            <Image
              src="/assets/banner-categories.webp"
              alt="Ръчно изработени персонализирани подаръци по категории"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 60vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <PageContainer>
          {productCategories.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {productCategories.map((category) => (
                <ProductCategoryCard key={category.slug} category={category} />
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-boutique-line bg-boutique-paper p-8 text-center text-boutique-muted">
              Все още няма добавени продуктови категории.
            </p>
          )}

          <div className="mt-14">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-boutique-sage-deep">
                  Още идеи
                </p>
                <h2 className="mt-2 font-heading text-3xl text-boutique-ink">
                  Разгледай и по повод
                </h2>
              </div>
              <Link
                href="/occasions"
                className="text-sm font-semibold text-boutique-sage-deep underline-offset-4 hover:underline"
              >
                Всички поводи →
              </Link>
            </div>
            <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-3">
              {occasionCategories.map((category) => (
                <OccasionCategoryLink key={category.slug} category={category} />
              ))}
            </div>
          </div>
        </PageContainer>
      </section>

      <section className="border-y border-boutique-line bg-boutique-paper">
        <PageContainer className="grid gap-8 py-10 lg:grid-cols-2 lg:gap-0">
          <div className="flex items-center gap-5 lg:pr-12">
            <span className="grid h-20 w-20 shrink-0 place-items-center rounded-full border border-boutique-sage/30 bg-white font-heading text-3xl text-boutique-sage-deep">
              ◇
            </span>
            <div>
              <h2 className="font-heading text-2xl text-boutique-ink">
                Разгледайте всички продукти
              </h2>
              <p className="mt-1 text-sm leading-6 text-boutique-muted">
                Открийте още ръчно изработени подаръци, създадени с внимание и любов.
              </p>
              <Link
                href="/shop"
                className="mt-4 inline-flex rounded-lg bg-boutique-sage-deep px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-boutique-ink"
              >
                Към всички продукти →
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-5 border-t border-boutique-line pt-8 lg:border-l lg:border-t-0 lg:pl-12 lg:pt-0">
            <span className="grid h-20 w-20 shrink-0 place-items-center rounded-full border border-boutique-rose/30 bg-white font-heading text-3xl text-boutique-rose-deep">
              ♡
            </span>
            <div>
              <h2 className="font-heading text-2xl text-boutique-ink">
                Нуждаете се от нещо специално?
              </h2>
              <p className="mt-1 text-sm leading-6 text-boutique-muted">
                Свържете се с нас и ще обсъдим персонализиран подарък специално за Вас.
              </p>
              <Link
                href="/contact"
                className="mt-4 inline-flex rounded-lg border border-boutique-sage-deep px-5 py-2.5 text-sm font-semibold text-boutique-sage-deep transition hover:bg-boutique-sage-deep hover:text-white"
              >
                Свържете се с нас →
              </Link>
            </div>
          </div>
        </PageContainer>
      </section>
    </div>
  );
}
