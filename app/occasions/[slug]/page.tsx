import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  CategoryIntroSection,
  CategorySeoBodySection,
} from "@/components/category/category-page-text-blocks";
import { JsonLd } from "@/components/seo/json-ld";
import { ContextFilter } from "@/components/catalog/context-filter";
import { PageContainer } from "@/components/layout/page-container";
import { VisualPageHero } from "@/components/layout/visual-page-hero";
import { ProductCard } from "@/components/product/product-card";
import {
  filterProductsByProductCategory,
  getProductCategoryFilterOptions,
  hasContextFilterParams,
} from "@/lib/catalog-context-filters";
import { readCatalogProductCategoryFilterValue } from "@/lib/catalog-filter-query-params";
import { resolveCategoryCoverImage } from "@/lib/category-image-resolution";
import {
  buildBreadcrumbListSchema,
  buildOccasionBreadcrumbItems,
} from "@/lib/seo/breadcrumbs";
import { OCCASION_INDEX_PATH, getOccasionPath } from "@/lib/category-url";
import { buildOccasionMetaDescription } from "@/lib/seo/category-description-seo";
import { getProductCategorySlugs } from "@/lib/seo/category-indexability";
import {
  resolveCategoryHeroDescription,
  resolveCategoryIntroText,
  resolveCategoryListingHeading,
  resolveCategorySeoBody,
} from "@/lib/seo/category-page-content";
import {
  buildCollectionPageSchema,
  shouldRenderCollectionSchema,
  toCollectionSchemaProducts,
} from "@/lib/seo/collection-schema";
import {
  buildOccasionPageMetadata,
  findOccasionCategory,
} from "@/lib/seo/occasion-metadata";
import { isOccasionIndexable } from "@/lib/seo/occasion-indexability";
import { getStorefrontCatalog } from "@/lib/storefront/repository";
import { getSiteUrl } from "@/lib/site-url";

type OccasionPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({
  params,
  searchParams,
}: OccasionPageProps): Promise<Metadata> {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const { categories, products } = await getStorefrontCatalog();
  const occasion = findOccasionCategory(categories, slug);

  if (!occasion) {
    notFound();
  }

  return buildOccasionPageMetadata({
    occasion,
    categories,
    productCategorySlugs: getProductCategorySlugs(products),
    faceted: hasContextFilterParams(query),
  });
}

export default async function OccasionPage({
  params,
  searchParams,
}: OccasionPageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const { categories, products } = await getStorefrontCatalog();
  const occasion = findOccasionCategory(categories, slug);

  if (!occasion) {
    notFound();
  }

  const occasionProducts = products.filter((product) =>
    product.categorySlugs.includes(occasion.slug),
  );
  const productOptions = getProductCategoryFilterOptions(
    categories,
    occasionProducts,
  );
  const requestedProduct = readCatalogProductCategoryFilterValue(query);
  const activeProduct = productOptions.some(
    (option) => option.value === requestedProduct,
  )
    ? requestedProduct
    : "";
  const filteredProducts = filterProductsByProductCategory(
    occasionProducts,
    activeProduct,
    categories,
    productOptions,
  );
  const description = resolveCategoryHeroDescription(
    occasion,
    `Открийте персонализирани подаръци за „${occasion.name}".`,
  );
  const listingHeading = resolveCategoryListingHeading(occasion);
  const introText = resolveCategoryIntroText(occasion);
  const seoBody = resolveCategorySeoBody(occasion);
  const heroImage = resolveCategoryCoverImage(occasion);
  const siteUrl = getSiteUrl();
  const faceted = hasContextFilterParams(query);
  const productCategorySlugs = getProductCategorySlugs(products);
  const breadcrumbSchema = buildBreadcrumbListSchema(
    buildOccasionBreadcrumbItems(occasion),
    siteUrl,
  );
  const collectionProducts = toCollectionSchemaProducts(occasionProducts);
  const structuredData = [
    breadcrumbSchema,
    ...(shouldRenderCollectionSchema({
      indexable: isOccasionIndexable(
        categories,
        productCategorySlugs,
        occasion,
      ),
      faceted,
      products: collectionProducts,
    })
      ? [
          buildCollectionPageSchema({
            name: occasion.name,
            description: buildOccasionMetaDescription(occasion),
            canonicalPath: getOccasionPath(occasion.slug),
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
            <Link href={OCCASION_INDEX_PATH} className="transition hover:underline">
              По повод
            </Link>
          </>
        }
        title={occasion.name}
        description={description}
        descriptionAs="h2"
        imageSrc={heroImage.src}
        imageAlt={heroImage.alt}
      />

      {introText ? <CategoryIntroSection text={introText} /> : null}

      <section className="bg-white py-10 md:py-14">
        <PageContainer>
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-boutique-line pb-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-boutique-rose-deep">
                По повод
              </p>
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
            action={getOccasionPath(occasion.slug)}
            label="Вид продукт"
            name="vid"
            value={activeProduct}
            allLabel="Всички видове продукти"
            options={productOptions}
          >
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 sm:gap-5 lg:grid-cols-3">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} variant="catalog" />
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-boutique-line p-8 text-center text-sm text-boutique-muted">
                {activeProduct
                  ? "Няма продукти от избрания вид за този повод."
                  : "Все още няма продукти за този повод."}
              </p>
            )}
          </ContextFilter>
        </PageContainer>
      </section>

      {seoBody ? <CategorySeoBodySection text={seoBody} /> : null}
    </div>
  );
}
