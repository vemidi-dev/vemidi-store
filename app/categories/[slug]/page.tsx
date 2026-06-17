import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import CategoryShowcaseCard from "@/components/category/category-showcase-card";
import { ContextFilter } from "@/components/catalog/context-filter";
import { JsonLd } from "@/components/seo/json-ld";
import { PageContainer } from "@/components/layout/page-container";
import { VisualPageHero } from "@/components/layout/visual-page-hero";
import { ProductCard } from "@/components/product/product-card";
import {
  getCategoryFamilySlugs,
  getChildCategories,
} from "@/lib/category-hierarchy";
import { CATEGORY_INDEX_PATH, getCategoryPath } from "@/lib/category-url";
import {
  filterProductsByOccasion,
  firstContextFilterValue,
  getOccasionFilterOptions,
  hasContextFilterParams,
} from "@/lib/catalog-context-filters";
import { resolveCategoryCoverImage } from "@/lib/category-image-resolution";
import { toShowcaseCategory } from "@/lib/storefront/mappers";
import { getStorefrontCatalog } from "@/lib/storefront/repository";
import {
  buildBreadcrumbListSchema,
  buildCategoryBreadcrumbItems,
} from "@/lib/seo/breadcrumbs";
import {
  buildCategoryPageMetadata,
} from "@/lib/seo/category-metadata";
import {
  getProductCategorySlugs,
} from "@/lib/seo/category-indexability";
import { getSiteUrl } from "@/lib/site-url";

type CategoryPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({
  params,
  searchParams,
}: CategoryPageProps): Promise<Metadata> {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const { categories, products } = await getStorefrontCatalog();
  const category = categories.find(
    (entry) => entry.category_type === "product" && entry.slug === slug,
  );

  if (!category) {
    notFound();
  }

  const parent = category.parent_id
    ? categories.find((entry) => entry.id === category.parent_id) ?? null
    : null;

  return buildCategoryPageMetadata({
    category,
    categories,
    productCategorySlugs: getProductCategorySlugs(products),
    parent,
    faceted: hasContextFilterParams(query),
  });
}

export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
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
  const occasionOptions = getOccasionFilterOptions(
    categories,
    categoryProducts,
  );
  const requestedOccasion = firstContextFilterValue(query.occasion);
  const activeOccasion = occasionOptions.some(
    (option) => option.value === requestedOccasion,
  )
    ? requestedOccasion
    : "";
  const filteredProducts = filterProductsByOccasion(
    categoryProducts,
    activeOccasion,
    occasionOptions,
  );
  const description =
    category.card_description?.trim() ||
    `Открийте ръчно изработени предложения в категория „${category.name}“.`;
  const heroImage = resolveCategoryCoverImage(category, parent);
  const breadcrumbSchema = buildBreadcrumbListSchema(
    buildCategoryBreadcrumbItems(categories, category),
    getSiteUrl(),
  );

  return (
    <div>
      <JsonLd data={breadcrumbSchema} />
      <VisualPageHero
        eyebrow={
          <>
            <Link href="/" className="transition hover:underline">
              Начало
            </Link>
            <span className="px-2" aria-hidden>
              ›
            </span>
            <Link href={CATEGORY_INDEX_PATH} className="transition hover:underline">
              Категории
            </Link>
            {parent ? (
              <>
                <span className="px-2" aria-hidden>
                  ›
                </span>
                <Link
                  href={getCategoryPath(parent.slug)}
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
        imageSrc={heroImage.src}
        imageAlt={heroImage.alt}
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
                  category={toShowcaseCategory(child)}
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
              {filteredProducts.length}{" "}
              {filteredProducts.length === 1 ? "продукт" : "продукта"}
            </p>
          </div>

          <ContextFilter
            action={getCategoryPath(category.slug)}
            label="По повод"
            name="occasion"
            value={activeOccasion}
            allLabel="Всички поводи"
            options={occasionOptions}
          >
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 sm:gap-5 lg:grid-cols-3">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} variant="catalog" />
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-boutique-line p-8 text-center text-sm text-boutique-muted">
                {activeOccasion
                  ? "Няма продукти по избрания повод."
                  : "Все още няма продукти в тази категория."}
              </p>
            )}
          </ContextFilter>
        </PageContainer>
      </section>
    </div>
  );
}
