import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";
import { VisualPageHero } from "@/components/layout/visual-page-hero";
import { MediaPlaceholder } from "@/components/ui/media-placeholder";
import {
  DEFAULT_CATEGORY_CARD_DESCRIPTION,
  type ShopCategory,
} from "@/lib/shop-categories";
import { getSiteContent } from "@/lib/content/site-content";
import {
  getSiteMediaMap,
  resolveSiteMediaFromMap,
} from "@/lib/content/site-media";
import {
  getCategoryFamilySlugs,
  getCategoryProductCount,
  sortCategoriesForDisplay,
} from "@/lib/category-hierarchy";
import { CATEGORY_INDEX_PATH, OCCASION_INDEX_PATH, getCategoryListingHref } from "@/lib/category-url";
import { filterStorefrontVisibleCategories } from "@/lib/category-visibility";
import { toShowcaseCategory } from "@/lib/storefront/mappers";
import { getStorefrontCatalog } from "@/lib/storefront/repository";

export const metadata: Metadata = {
  title: "Категории",
  description:
    "Разгледайте ръчно изработените подаръци на VeMiDi по вид продукт и по повод.",
  alternates: { canonical: CATEGORY_INDEX_PATH },
  openGraph: {
    type: "website",
    title: "Категории",
    description:
      "Разгледайте ръчно изработените подаръци на VeMiDi по вид продукт и по повод.",
    url: CATEGORY_INDEX_PATH,
  },
  twitter: {
    card: "summary_large_image",
    title: "Категории",
    description:
      "Разгледайте ръчно изработените подаръци на VeMiDi по вид продукт и по повод.",
  },
};

type CategoryWithCount = ShopCategory & {
  productCount: number;
};

function getCategoryHref(category: ShopCategory) {
  return getCategoryListingHref({
    slug: category.slug,
    category_type: category.categoryType,
  });
}

function getProductLabel(count: number) {
  return count === 1 ? "1 продукт" : `${count} продукта`;
}

function ProductCategoryCard({ category }: { category: CategoryWithCount }) {
  return (
    <Link
      href={getCategoryHref(category)}
      className="group overflow-hidden rounded-xl border border-boutique-line bg-white shadow-boutique-sm transition duration-300 hover:-translate-y-1 hover:border-boutique-sage/50 hover:shadow-boutique sm:rounded-2xl"
    >
      <div className="relative aspect-[5/4] overflow-hidden bg-boutique-paper sm:aspect-[4/3]">
        {category.imageSrc ? (
          <Image
            src={category.imageSrc}
            alt={category.imageAlt}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <MediaPlaceholder label="Снимка на категорията" />
        )}
      </div>

      <div className="p-2.5 sm:p-5">
        <h2 className="line-clamp-2 font-heading text-sm leading-snug text-boutique-ink sm:text-2xl sm:leading-tight">
          {category.title}
        </h2>
        {category.productCount > 0 ? (
          <p className="mt-0.5 text-[0.6875rem] font-medium text-boutique-sage-deep sm:mt-1 sm:text-xs">
            {getProductLabel(category.productCount)}
          </p>
        ) : null}
        <p className="mt-2 hidden min-h-10 text-sm leading-5 text-boutique-muted sm:block">
          {category.cardDescription?.trim() || DEFAULT_CATEGORY_CARD_DESCRIPTION}
        </p>
        <span className="mt-1.5 inline-flex min-h-8 items-center gap-1 text-xs font-semibold text-boutique-sage-deep sm:mt-4 sm:min-h-0 sm:gap-2 sm:text-sm">
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
      className="group flex items-center gap-2 rounded-xl border border-boutique-line bg-white px-2.5 py-2 transition hover:border-boutique-rose-deep/35 hover:bg-boutique-blush/35 sm:gap-3 sm:px-4 sm:py-3"
    >
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-boutique-line bg-boutique-paper sm:h-12 sm:w-12">
        {category.imageSrc ? (
          <Image
            src={category.imageSrc}
            alt={category.imageAlt}
            fill
            sizes="48px"
            className="object-cover transition duration-300 group-hover:scale-110"
          />
        ) : (
          <span className="grid h-full w-full place-items-center font-heading text-base text-boutique-sage-deep sm:text-lg">
            {category.title.slice(0, 1)}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 font-heading text-sm leading-snug text-boutique-ink sm:text-lg sm:leading-tight">
          {category.title}
        </p>
        {category.productCount > 0 ? (
          <p className="mt-0.5 text-[0.6875rem] text-boutique-muted sm:mt-1 sm:text-xs">
            {getProductLabel(category.productCount)}
          </p>
        ) : (
          <p className="mt-0.5 text-[0.6875rem] text-boutique-muted sm:mt-1 sm:text-xs">Разгледай идеи</p>
        )}
      </div>
    </Link>
  );
}

export default async function CategoriesPage() {
  const [{ categories, products }, content, siteMediaMap] = await Promise.all([
    getStorefrontCatalog(),
    getSiteContent(),
    getSiteMediaMap(),
  ]);
  const heroImage = resolveSiteMediaFromMap(siteMediaMap, "categories.hero");
  const visibleCategories = filterStorefrontVisibleCategories(categories);
  const orderedProductCategories = sortCategoriesForDisplay(
    visibleCategories.filter(
      (category) => category.category_type === "product",
    ),
  );
  const withCounts = visibleCategories.map(
    (category): CategoryWithCount => ({
      ...toShowcaseCategory(category),
      productCount: getCategoryProductCount(
        products.map((product) => product.categorySlugs),
        getCategoryFamilySlugs(visibleCategories, category),
      ),
    }),
  );
  const categoryWithCountById = new Map(
    withCounts.map((category) => [category.id, category]),
  );
  const productCategories = orderedProductCategories
    .filter((category) => category.parent_id === null)
    .map((category) => categoryWithCountById.get(category.id))
    .filter((category): category is CategoryWithCount => Boolean(category));
  const occasionCategories = withCounts.filter(
    (category) => category.categoryType === "occasion",
  );

  return (
    <div>
      <VisualPageHero
        eyebrow={
          <>
            <Link href="/" className="transition hover:underline">Начало</Link>
            <span className="px-2" aria-hidden>›</span>
            {content["categories.hero_title"]}
          </>
        }
        title={content["categories.hero_title"]}
        description={content["categories.hero_description"]}
        descriptionAs="h2"
        imageSrc={heroImage.src}
        imageAlt={heroImage.alt}
      />

      <section className="py-6 md:py-16">
        <PageContainer>
          {productCategories.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 sm:gap-5 xl:grid-cols-4">
              {productCategories.map((category) => (
                <ProductCategoryCard key={category.slug} category={category} />
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-boutique-line bg-boutique-paper p-8 text-center text-boutique-muted">
              Все още няма добавени продуктови категории.
            </p>
          )}

          <div className="mt-10 sm:mt-14">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3 sm:mb-6 sm:gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-boutique-sage-deep">
                  {content["categories.occasions_eyebrow"]}
                </p>
                <h2 className="mt-1.5 font-heading text-2xl text-boutique-ink sm:mt-2 sm:text-3xl">
                  {content["categories.occasions_title"]}
                </h2>
              </div>
              <Link
                href={OCCASION_INDEX_PATH}
                className="text-sm font-semibold text-boutique-sage-deep underline-offset-4 hover:underline"
              >
                Всички поводи →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
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
                {content["categories.products_cta_title"]}
              </h2>
              <p className="mt-1 text-sm leading-6 text-boutique-muted">
                {content["categories.products_cta_text"]}
              </p>
              <Link
                href="/produkti"
                className="mt-4 inline-flex rounded-lg bg-boutique-sage-deep px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-boutique-ink"
              >
                {content["categories.products_cta_button"]} →
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-5 border-t border-boutique-line pt-8 lg:border-l lg:border-t-0 lg:pl-12 lg:pt-0">
            <span className="grid h-20 w-20 shrink-0 place-items-center rounded-full border border-boutique-rose/30 bg-white font-heading text-3xl text-boutique-rose-deep">
              ♡
            </span>
            <div>
              <h2 className="font-heading text-2xl text-boutique-ink">
                {content["categories.custom_cta_title"]}
              </h2>
              <p className="mt-1 text-sm leading-6 text-boutique-muted">
                {content["categories.custom_cta_text"]}
              </p>
              <Link
                href="/kontakti"
                className="mt-4 inline-flex rounded-lg border border-boutique-sage-deep px-5 py-2.5 text-sm font-semibold text-boutique-sage-deep transition hover:bg-boutique-sage-deep hover:text-white"
              >
                {content["categories.custom_cta_button"]} →
              </Link>
            </div>
          </div>
        </PageContainer>
      </section>
    </div>
  );
}
