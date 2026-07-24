import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";
import { VisualPageHero } from "@/components/layout/visual-page-hero";
import { MediaPlaceholder } from "@/components/ui/media-placeholder";
import {
  getCategoryFamilySlugs,
  getCategoryProductCount,
  sortCategoriesForDisplay,
} from "@/lib/category-hierarchy";
import { MATERIAL_INDEX_PATH, getMaterialPath } from "@/lib/category-url";
import { filterStorefrontVisibleCategories } from "@/lib/category-visibility";
import {
  DEFAULT_CATEGORY_CARD_DESCRIPTION,
  type ShopCategory,
} from "@/lib/shop-categories";
import { toShowcaseCategory } from "@/lib/storefront/mappers";
import { getStorefrontCatalog } from "@/lib/storefront/repository";

export const metadata: Metadata = {
  title: "Заготовки и материали",
  description:
    "Разгледайте заготовки, материали и консумативи за творчески проекти от VeMiDi crafts.",
  alternates: { canonical: MATERIAL_INDEX_PATH },
};

type MaterialWithCount = ShopCategory & {
  productCount: number;
};

function getProductLabel(count: number) {
  return count === 1 ? "1 продукт" : `${count} продукта`;
}

function MaterialCategoryCard({ category }: { category: MaterialWithCount }) {
  return (
    <Link
      href={getMaterialPath(category.slug)}
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
          Разгледайте
          <span aria-hidden className="transition group-hover:translate-x-1">
            →
          </span>
        </span>
      </div>
    </Link>
  );
}

export default async function MaterialsPage() {
  const { categories, products } = await getStorefrontCatalog();
  const visibleCategories = filterStorefrontVisibleCategories(categories);
  const orderedMaterialCategories = sortCategoriesForDisplay(
    visibleCategories.filter((category) => category.category_type === "material"),
  );
  const withCounts = orderedMaterialCategories.map(
    (category): MaterialWithCount => ({
      ...toShowcaseCategory(category),
      productCount: getCategoryProductCount(
        products.map((product) => product.categorySlugs),
        getCategoryFamilySlugs(visibleCategories, category),
      ),
    }),
  );
  const materialCategories = withCounts.filter(
    (category) => category.parentId === null,
  );

  return (
    <div>
      <VisualPageHero
        eyebrow="За творчество и декорация"
        title="Заготовки и материали"
        description="Изберете основи, заготовки и материали за вашите творчески проекти."
        descriptionAs="h2"
        imageSrc="/assets/products.png"
        imageAlt="Заготовки и материали"
      />

      <section className="py-6 md:py-16">
        <PageContainer>
          {materialCategories.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 sm:gap-5 xl:grid-cols-4">
              {materialCategories.map((category) => (
                <MaterialCategoryCard key={category.slug} category={category} />
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-boutique-line bg-boutique-paper p-8 text-center text-boutique-muted">
              Все още няма добавени заготовки и материали.
            </p>
          )}
        </PageContainer>
      </section>
    </div>
  );
}
