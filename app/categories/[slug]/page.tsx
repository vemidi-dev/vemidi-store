import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import CategoryShowcaseCard from "@/components/category/category-showcase-card";
import { PageContainer } from "@/components/layout/page-container";
import { VisualPageHero } from "@/components/layout/visual-page-hero";
import { ProductCard } from "@/components/product/product-card";
import {
  getCategoryFamilySlugs,
  getChildCategories,
} from "@/lib/category-hierarchy";
import { getCategoryImageSrc } from "@/lib/category-images";
import { toShowcaseCategory } from "@/lib/storefront/mappers";
import { getStorefrontCatalog } from "@/lib/storefront/repository";

type CategoryPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const { categories } = await getStorefrontCatalog();
  const category = categories.find(
    (entry) => entry.category_type === "product" && entry.slug === slug,
  );

  if (!category) {
    return {};
  }

  const imageCategory = category.parent_id
    ? categories.find((entry) => entry.id === category.parent_id) ?? category
    : category;
  const description =
    category.card_description?.trim() ||
    `Разгледайте ръчно изработени продукти в категория „${category.name}“ от VeMiDi crafts.`;

  return {
    title: category.name,
    description,
    alternates: { canonical: `/categories/${category.slug}` },
    openGraph: {
      title: category.name,
      description,
      url: `/categories/${category.slug}`,
      images: [
        getCategoryImageSrc(imageCategory.slug, imageCategory.category_type),
      ],
    },
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const { categories, products } = await getStorefrontCatalog();
  const category = categories.find(
    (entry) => entry.category_type === "product" && entry.slug === slug,
  );

  if (!category) {
    notFound();
  }

  const parent = category.parent_id
    ? categories.find((entry) => entry.id === category.parent_id)
    : null;
  const children = getChildCategories(categories, category.id);
  const acceptedSlugs = new Set(getCategoryFamilySlugs(categories, category));
  const categoryProducts = products.filter((product) =>
    product.categorySlugs.some((categorySlug) =>
      acceptedSlugs.has(categorySlug),
    ),
  );
  const description =
    category.card_description?.trim() ||
    `Открийте ръчно изработени предложения в категория „${category.name}“.`;
  const imageCategory = parent ?? category;
  const categoryImageSrc = getCategoryImageSrc(
    imageCategory.slug,
    imageCategory.category_type,
  );

  return (
    <div>
      <VisualPageHero
        eyebrow={
          <>
            <Link href="/" className="transition hover:underline">
              Начало
            </Link>
            <span className="px-2" aria-hidden>
              ›
            </span>
            <Link href="/categories" className="transition hover:underline">
              Категории
            </Link>
            {parent ? (
              <>
                <span className="px-2" aria-hidden>
                  ›
                </span>
                <Link
                  href={`/categories/${parent.slug}`}
                  className="transition hover:underline"
                >
                  {parent.name}
                </Link>
              </>
            ) : null}
          </>
        }
        title={category.name}
        description={description}
        imageSrc={categoryImageSrc}
        imageAlt={`Ръчно изработени продукти в категория ${category.name}`}
      />

      {children.length > 0 ? (
        <section className="border-b border-boutique-line bg-boutique-paper py-8 md:py-12">
          <PageContainer>
            <h2 className="font-heading text-2xl text-boutique-ink md:text-3xl">
              Подкатегории
            </h2>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
              {children.map((child) => (
                <CategoryShowcaseCard
                  key={child.id}
                  category={{
                    ...toShowcaseCategory(child),
                    imageSrc: categoryImageSrc,
                    imageAlt: `${child.name} в категория ${category.name}`,
                  }}
                  compact
                />
              ))}
            </div>
          </PageContainer>
        </section>
      ) : null}

      <section className="bg-white py-10 md:py-14">
        <PageContainer>
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-boutique-line pb-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-boutique-sage-deep">
                {parent ? parent.name : "Категория"}
              </p>
              <h2 className="mt-2 font-heading text-3xl text-boutique-ink">
                {category.name}
              </h2>
            </div>
            <p className="text-sm text-boutique-muted">
              {categoryProducts.length}{" "}
              {categoryProducts.length === 1 ? "продукт" : "продукта"}
            </p>
          </div>

          {categoryProducts.length > 0 ? (
            <div className="mt-6 grid grid-cols-2 gap-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
              {categoryProducts.map((product) => (
                <ProductCard key={product.id} product={product} variant="catalog" />
              ))}
            </div>
          ) : (
            <p className="mt-8 rounded-xl border border-dashed border-boutique-line p-8 text-center text-sm text-boutique-muted">
              Все още няма добавени продукти в тази категория.
            </p>
          )}
        </PageContainer>
      </section>
    </div>
  );
}
