import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  CategoryIntroSection,
  CategorySeoBodySection,
} from "@/components/category/category-page-text-blocks";
import { CategoryDiscoverySection } from "@/components/category/category-discovery-section";
import { ContextFilter } from "@/components/catalog/context-filter";
import { JsonLd } from "@/components/seo/json-ld";
import { PageContainer } from "@/components/layout/page-container";
import { VisualPageHero } from "@/components/layout/visual-page-hero";
import { ProductCard } from "@/components/product/product-card";
import {
  getCategoryFamilySlugs,
  getChildCategories,
} from "@/lib/category-hierarchy";
import { getRelatedCategoriesForCategory } from "@/lib/category-related-storefront";
import { findVisibleProductCategoryBySlug, filterStorefrontVisibleCategories } from "@/lib/category-visibility";
import { CATEGORY_INDEX_PATH, getCategoryPath } from "@/lib/category-url";
import {
  filterProductsByOccasion,
  getOccasionFilterOptions,
  hasContextFilterParams,
} from "@/lib/catalog-context-filters";
import { readCatalogOccasionFilterValue } from "@/lib/catalog-filter-query-params";
import { resolveCategoryCoverImage } from "@/lib/category-image-resolution";
import { getStorefrontCatalog } from "@/lib/storefront/repository";
import {
  buildBreadcrumbListSchema,
  buildCategoryBreadcrumbItems,
} from "@/lib/seo/breadcrumbs";
import {
  buildCategoryPageMetadata,
} from "@/lib/seo/category-metadata";
import { buildCategoryMetaDescription } from "@/lib/seo/category-description-seo";
import {
  resolveCategoryHeroDescription,
  resolveCategoryIntroText,
  resolveCategoryListingHeading,
  resolveCategorySeoBody,
} from "@/lib/seo/category-page-content";
import {
  getProductCategorySlugs,
  isProductCategoryIndexable,
} from "@/lib/seo/category-indexability";
import {
  buildCollectionPageSchema,
  shouldRenderCollectionSchema,
  toCollectionSchemaProducts,
} from "@/lib/seo/collection-schema";
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
  const category = findVisibleProductCategoryBySlug(categories, slug);

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
  const { categories, products, relatedCategoryIdsByCategoryId } =
    await getStorefrontCatalog();
  const category = findVisibleProductCategoryBySlug(categories, slug);

  if (!category) {
    notFound();
  }

  const parent = category.parent_id
    ? categories.find((entry) => entry.id === category.parent_id)
    : null;
  const children = getChildCategories(
    filterStorefrontVisibleCategories(categories),
    category.id,
  );
  const relatedCategories = getRelatedCategoriesForCategory(
    categories,
    relatedCategoryIdsByCategoryId,
    category,
  );
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
  const requestedOccasion = readCatalogOccasionFilterValue(query);
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
  const description = resolveCategoryHeroDescription(
    category,
    `Открийте ръчно изработени предложения в категория „${category.name}".`,
  );
  const listingHeading = resolveCategoryListingHeading(category);
  const introText = resolveCategoryIntroText(category);
  const seoBody = resolveCategorySeoBody(category);
  const heroImage = resolveCategoryCoverImage(category, parent);
  const siteUrl = getSiteUrl();
  const faceted = hasContextFilterParams(query);
  const productCategorySlugs = getProductCategorySlugs(products);
  const breadcrumbSchema = buildBreadcrumbListSchema(
    buildCategoryBreadcrumbItems(categories, category),
    siteUrl,
  );
  const collectionProducts = toCollectionSchemaProducts(categoryProducts);
  const structuredData = [
    breadcrumbSchema,
    ...(shouldRenderCollectionSchema({
      indexable: isProductCategoryIndexable(
        categories,
        productCategorySlugs,
        category,
      ),
      faceted,
      products: collectionProducts,
    })
      ? [
          buildCollectionPageSchema({
            name: category.name,
            description: buildCategoryMetaDescription(category),
            canonicalPath: getCategoryPath(category.slug),
            products: collectionProducts,
            siteUrl,
          }),
        ]
      : []),
  ];

  return (
    <div>
      <JsonLd data={structuredData} />
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
        descriptionAs="h2"
        imageSrc={heroImage.src}
        imageAlt={heroImage.alt}
      />

      {introText ? <CategoryIntroSection text={introText} /> : null}

      <CategoryDiscoverySection
        subcategories={children}
        relatedCategories={relatedCategories}
      />

      <section className="bg-white py-10 md:py-14">
        <PageContainer>
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-boutique-line pb-5">
            <div>
              {parent ? (
                <Link
                  href={getCategoryPath(parent.slug)}
                  className="text-xs font-semibold uppercase tracking-[0.18em] text-boutique-sage-deep transition hover:text-boutique-accent hover:underline"
                  aria-label={`Назад към категория ${parent.name}`}
                >
                  ← {parent.name}
                </Link>
              ) : (
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-boutique-sage-deep">
                  Категория
                </p>
              )}
              <h2 className="mt-2 font-heading text-3xl text-boutique-ink">
                {listingHeading}
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
            name="povod"
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

      {seoBody ? <CategorySeoBodySection text={seoBody} /> : null}
    </div>
  );
}
