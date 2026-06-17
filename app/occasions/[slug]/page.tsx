import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/seo/json-ld";
import { ContextFilter } from "@/components/catalog/context-filter";
import { PageContainer } from "@/components/layout/page-container";
import { VisualPageHero } from "@/components/layout/visual-page-hero";
import { ProductCard } from "@/components/product/product-card";
import {
  filterProductsByProductCategory,
  firstContextFilterValue,
  getProductCategoryFilterOptions,
  hasContextFilterParams,
} from "@/lib/catalog-context-filters";
import { resolveCategoryCoverImage } from "@/lib/category-image-resolution";
import {
  buildBreadcrumbListSchema,
  buildOccasionBreadcrumbItems,
} from "@/lib/seo/breadcrumbs";
import { OCCASION_INDEX_PATH } from "@/lib/category-url";
import { getProductCategorySlugs } from "@/lib/seo/category-indexability";
import {
  buildOccasionPageMetadata,
  findOccasionCategory,
} from "@/lib/seo/occasion-metadata";
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
  const requestedProduct = firstContextFilterValue(query.product);
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
  const description =
    occasion.card_description?.trim() ||
    `Открийте персонализирани подаръци за „${occasion.name}“.`;
  const heroImage = resolveCategoryCoverImage(occasion);
  const breadcrumbSchema = buildBreadcrumbListSchema(
    buildOccasionBreadcrumbItems(occasion),
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
            <Link href={OCCASION_INDEX_PATH} className="transition hover:underline">
              По повод
            </Link>
          </>
        }
        title={occasion.name}
        description={description}
        imageSrc={heroImage.src}
        imageAlt={heroImage.alt}
      />

      <section className="bg-white py-10 md:py-14">
        <PageContainer>
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-boutique-line pb-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-boutique-rose-deep">
                По повод
              </p>
              <h2 className="mt-2 font-heading text-3xl text-boutique-ink">
                {occasion.name}
              </h2>
            </div>
            <p className="text-sm text-boutique-muted">
              {filteredProducts.length}{" "}
              {filteredProducts.length === 1 ? "продукт" : "продукта"}
            </p>
          </div>

          <ContextFilter
            action={`${OCCASION_INDEX_PATH}/${occasion.slug}`}
            label="Вид продукт"
            name="product"
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
    </div>
  );
}
