import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  CategoryIntroSection,
  CategorySeoBodySection,
} from "@/components/category/category-page-text-blocks";
import { CategoryDiscoverySection } from "@/components/category/category-discovery-section";
import { PageContainer } from "@/components/layout/page-container";
import { VisualPageHero } from "@/components/layout/visual-page-hero";
import { ProductCard } from "@/components/product/product-card";
import {
  getCategoryFamilySlugs,
  getChildCategories,
} from "@/lib/category-hierarchy";
import { resolveCategoryCoverImage } from "@/lib/category-image-resolution";
import { getRelatedCategoriesForCategory } from "@/lib/category-related-storefront";
import { MATERIAL_INDEX_PATH, getMaterialPath } from "@/lib/category-url";
import {
  filterStorefrontVisibleCategories,
  findVisibleMaterialCategoryBySlug,
} from "@/lib/category-visibility";
import {
  resolveCategoryHeroDescription,
  resolveCategoryIntroText,
  resolveCategoryListingHeading,
  resolveCategorySeoBody,
} from "@/lib/seo/category-page-content";
import { getStorefrontCatalog } from "@/lib/storefront/repository";

type MaterialCategoryPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: MaterialCategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const { categories } = await getStorefrontCatalog();
  const category = findVisibleMaterialCategoryBySlug(categories, slug);

  if (!category) {
    notFound();
  }

  const title = category.meta_title?.trim() || `${category.name} | Заготовки и материали`;
  const description =
    category.meta_description?.trim() ||
    category.hero_description?.trim() ||
    `Разгледайте ${category.name.toLocaleLowerCase("bg")} от VeMiDi crafts.`;

  return {
    title,
    description,
    alternates: { canonical: getMaterialPath(category.slug) },
    robots: category.robots_index === false ? { index: false, follow: true } : undefined,
    openGraph: {
      type: "website",
      title: category.og_title?.trim() || title,
      description: category.og_description?.trim() || description,
      url: getMaterialPath(category.slug),
    },
  };
}

export default async function MaterialCategoryPage({
  params,
}: MaterialCategoryPageProps) {
  const { slug } = await params;
  const { categories, products, relatedCategoryIdsByCategoryId } =
    await getStorefrontCatalog();
  const category = findVisibleMaterialCategoryBySlug(categories, slug);

  if (!category) {
    notFound();
  }

  const parent = category.parent_id
    ? categories.find((entry) => entry.id === category.parent_id)
    : null;
  const visibleCategories = filterStorefrontVisibleCategories(categories);
  const children = getChildCategories(visibleCategories, category.id);
  const relatedCategories = getRelatedCategoriesForCategory(
    categories,
    relatedCategoryIdsByCategoryId,
    category,
  );
  const acceptedSlugs = new Set(getCategoryFamilySlugs(categories, category));
  const categoryProducts = products.filter((product) =>
    product.categorySlugs.some((categorySlug) => acceptedSlugs.has(categorySlug)),
  );
  const description = resolveCategoryHeroDescription(
    category,
    `Разгледайте заготовки и материали в категория „${category.name}".`,
  );
  const listingHeading = resolveCategoryListingHeading(category);
  const introText = resolveCategoryIntroText(category);
  const seoBody = resolveCategorySeoBody(category);
  const heroImage = resolveCategoryCoverImage(category, parent);

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
            <Link href={MATERIAL_INDEX_PATH} className="transition hover:underline">
              Заготовки и материали
            </Link>
            {parent ? (
              <>
                <span className="px-2" aria-hidden>
                  ›
                </span>
                <Link
                  href={getMaterialPath(parent.slug)}
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
        imageSrc={heroImage.src || "/assets/products.png"}
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
                  href={getMaterialPath(parent.slug)}
                  className="text-xs font-semibold uppercase tracking-[0.18em] text-boutique-sage-deep transition hover:text-boutique-accent hover:underline"
                >
                  ← {parent.name}
                </Link>
              ) : (
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-boutique-sage-deep">
                  Заготовки и материали
                </p>
              )}
              <h2 className="mt-2 font-heading text-3xl text-boutique-ink">
                {listingHeading}
              </h2>
            </div>
            <p className="text-sm text-boutique-muted">
              {categoryProducts.length}{" "}
              {categoryProducts.length === 1 ? "продукт" : "продукта"}
            </p>
          </div>

          {categoryProducts.length > 0 ? (
            <div className="mt-6 grid grid-cols-2 gap-2 sm:gap-5 lg:grid-cols-3">
              {categoryProducts.map((product) => (
                <ProductCard key={product.id} product={product} variant="catalog" />
              ))}
            </div>
          ) : (
            <p className="mt-6 rounded-xl border border-dashed border-boutique-line p-8 text-center text-sm text-boutique-muted">
              Все още няма продукти в тази категория.
            </p>
          )}
        </PageContainer>
      </section>

      {seoBody ? <CategorySeoBodySection text={seoBody} /> : null}
    </div>
  );
}
