import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/seo/json-ld";
import { PageContainer } from "@/components/layout/page-container";
import { VisualPageHero } from "@/components/layout/visual-page-hero";
import { ProductCard } from "@/components/product/product-card";
import { getCategoryImageSrc } from "@/lib/category-images";
import {
  buildBreadcrumbListSchema,
  buildOccasionBreadcrumbItems,
} from "@/lib/seo/breadcrumbs";
import { getProductCategorySlugs } from "@/lib/seo/category-indexability";
import {
  buildOccasionPageMetadata,
  findOccasionCategory,
} from "@/lib/seo/occasion-metadata";
import { getStorefrontCatalog } from "@/lib/storefront/repository";
import { getSiteUrl } from "@/lib/site-url";

type OccasionPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: OccasionPageProps): Promise<Metadata> {
  const { slug } = await params;
  const { categories, products } = await getStorefrontCatalog();
  const occasion = findOccasionCategory(categories, slug);

  if (!occasion) {
    notFound();
  }

  return buildOccasionPageMetadata({
    occasion,
    productCategorySlugs: getProductCategorySlugs(products),
  });
}

export default async function OccasionPage({ params }: OccasionPageProps) {
  const { slug } = await params;
  const { categories, products } = await getStorefrontCatalog();
  const occasion = findOccasionCategory(categories, slug);

  if (!occasion) {
    notFound();
  }

  const occasionProducts = products.filter((product) =>
    product.categorySlugs.includes(occasion.slug),
  );
  const description =
    occasion.card_description?.trim() ||
    `Открийте персонализирани подаръци за „${occasion.name}“.`;
  const imageSrc = getCategoryImageSrc(occasion.slug, occasion.category_type);
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
            <Link href="/occasions" className="transition hover:underline">
              По повод
            </Link>
          </>
        }
        title={occasion.name}
        description={description}
        imageSrc={imageSrc}
        imageAlt={`Персонализирани подаръци за ${occasion.name}`}
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
              {occasionProducts.length}{" "}
              {occasionProducts.length === 1 ? "продукт" : "продукта"}
            </p>
          </div>

          {occasionProducts.length > 0 ? (
            <div className="mt-6 grid grid-cols-2 gap-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
              {occasionProducts.map((product) => (
                <ProductCard key={product.id} product={product} variant="catalog" />
              ))}
            </div>
          ) : (
            <p className="mt-8 rounded-xl border border-dashed border-boutique-line p-8 text-center text-sm text-boutique-muted">
              Все още няма добавени продукти за този повод.
            </p>
          )}
        </PageContainer>
      </section>
    </div>
  );
}
