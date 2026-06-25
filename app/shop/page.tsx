import Link from "next/link";
import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";

import { ProductCard } from "@/components/product/product-card";
import { PageContainer } from "@/components/layout/page-container";
import { VisualPageHero } from "@/components/layout/visual-page-hero";
import { isProductOnPromotion } from "@/lib/product-pricing";
import { PRODUCT_INDEX_PATH } from "@/lib/product-url";
import { getSiteContent } from "@/lib/content/site-content";
import {
  getSiteMediaMap,
  resolveSiteMediaFromMap,
} from "@/lib/content/site-media";
import {
  getCategoryDisplayLabel,
  getCategoryFamilySlugs,
  sortCategoriesForDisplay,
} from "@/lib/category-hierarchy";
import { filterStorefrontVisibleCategories } from "@/lib/category-visibility";
import {
  buildShopMetadata,
  isShopFaceted,
  parseShopSearchParams,
  resolveShopCategoryRedirect,
} from "@/lib/seo/shop-route";
import { getStorefrontCatalog } from "@/lib/storefront/repository";

type ShopPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({
  searchParams,
}: ShopPageProps): Promise<Metadata> {
  const params = await searchParams;
  const [{ categories }, siteMediaMap] = await Promise.all([
    getStorefrontCatalog(),
    getSiteMediaMap(),
  ]);
  const visibleCategories = filterStorefrontVisibleCategories(categories);
  const parsed = parseShopSearchParams(params);
  const shopHero = resolveSiteMediaFromMap(siteMediaMap, "shop.hero");
  const socialImage =
    !resolveShopCategoryRedirect(params, parsed, visibleCategories) &&
    !isShopFaceted(params, parsed, visibleCategories)
      ? { src: shopHero.src, alt: shopHero.alt }
      : undefined;

  return buildShopMetadata(params, visibleCategories, socialImage);
}

type FilterValue = {
  id: string;
  label: string;
};

function getPriceBucket(price: number): FilterValue["id"] {
  if (price < 20) {
    return "under-20";
  }
  if (price < 40) {
    return "20-40";
  }
  if (price < 60) {
    return "40-60";
  }
  return "over-60";
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const params = await searchParams;
  const parsed = parseShopSearchParams(params);
  const [{ categories, products }, content, siteMediaMap] = await Promise.all([
    getStorefrontCatalog(),
    getSiteContent(),
    getSiteMediaMap(),
  ]);
  const heroImage = resolveSiteMediaFromMap(siteMediaMap, "shop.hero");

  const visibleCategories = filterStorefrontVisibleCategories(categories);

  const categoryRedirect = resolveShopCategoryRedirect(
    params,
    parsed,
    visibleCategories,
  );
  if (categoryRedirect) {
    permanentRedirect(categoryRedirect);
  }

  const query = parsed.q;
  const legacyCategory = parsed.legacyCategory;
  const requestedProductCategory = parsed.product;
  const requestedOccasion = parsed.occasion;
  const activePrice = parsed.price;
  const activeSort = parsed.sort || "featured";
  const personalizationOnly = parsed.personalizationOnly;
  const promotionsOnly = parsed.promotionsOnly;

  const productCategoryFilters: FilterValue[] = sortCategoriesForDisplay(
    visibleCategories.filter((category) => category.category_type === "product"),
  )
    .map((category) => ({
      id: category.slug,
      label: getCategoryDisplayLabel(categories, category),
    }));
  const occasionFilters: FilterValue[] = visibleCategories
    .filter((category) => category.category_type === "occasion")
    .map((category) => ({
    id: category.slug,
    label: category.name,
  }));
  const legacyCategoryType = visibleCategories.find(
    (category) => category.slug === legacyCategory,
  )?.category_type;
  const activeProductCategory =
    requestedProductCategory ||
    (legacyCategoryType === "product" ? legacyCategory : "");
  const activeOccasion =
    requestedOccasion ||
    (legacyCategoryType === "occasion" ? legacyCategory : "");
  const selectedProductCategory = visibleCategories.find(
    (category) =>
      category.category_type === "product" &&
      category.slug === activeProductCategory,
  );
  const activeProductCategorySlugs = new Set(
    selectedProductCategory
      ? getCategoryFamilySlugs(categories, selectedProductCategory)
      : [],
  );
  const priceFilters: FilterValue[] = [
    { id: "under-20", label: "До 20 EUR" },
    { id: "20-40", label: "20-40 EUR" },
    { id: "40-60", label: "40-60 EUR" },
    { id: "over-60", label: "Над 60 EUR" },
  ];

  const allItems = products.map((product, index) => ({ ...product, index }));

  let filtered = allItems.filter((product) => {
    const text = `${product.title} ${product.description}`.toLowerCase();
    const matchesQuery = query ? text.includes(query.toLowerCase()) : true;
    const matchesProductCategory = activeProductCategory
      ? product.categorySlugs.some((slug) =>
          activeProductCategorySlugs.has(slug),
        )
      : true;
    const matchesOccasion = activeOccasion
      ? product.categorySlugs.includes(activeOccasion)
      : true;
    const matchesPersonalization = personalizationOnly ? Boolean(product.customizable) : true;
    const matchesPromotions = promotionsOnly ? isProductOnPromotion(product) : true;
    const matchesPrice = activePrice ? getPriceBucket(product.price) === activePrice : true;

    return (
      matchesQuery &&
      matchesProductCategory &&
      matchesOccasion &&
      matchesPersonalization &&
      matchesPromotions &&
      matchesPrice
    );
  });

  filtered = [...filtered].sort((a, b) => {
    if (activeSort === "price-asc") {
      return a.price - b.price;
    }
    if (activeSort === "price-desc") {
      return b.price - a.price;
    }
    if (activeSort === "name-asc") {
      return a.title.localeCompare(b.title, "bg");
    }
    if (activeSort === "name-desc") {
      return b.title.localeCompare(a.title, "bg");
    }
    return a.index - b.index;
  });

  const activeChips = [
    activeProductCategory
      ? `Вид продукт: ${productCategoryFilters.find((item) => item.id === activeProductCategory)?.label ?? activeProductCategory}`
      : "",
    activeOccasion
      ? `Повод: ${occasionFilters.find((item) => item.id === activeOccasion)?.label ?? activeOccasion}`
      : "",
    activePrice ? `Цена: ${priceFilters.find((item) => item.id === activePrice)?.label ?? activePrice}` : "",
    personalizationOnly ? "Само с персонализация" : "",
    promotionsOnly ? "Само промоции" : "",
    query ? `Търсене: "${query}"` : "",
  ].filter(Boolean);

  function FilterFields() {
    return (
      <>
        <input type="hidden" name="q" value={query} />
        <input type="hidden" name="sort" value={activeSort} />

        <fieldset className="border-t border-boutique-line pt-4 lg:pt-5">
          <legend className="font-heading text-base text-boutique-ink lg:text-lg">По повод</legend>
          <div className="mt-2.5 space-y-2 lg:mt-3 lg:space-y-2.5">
            <label className="flex items-center gap-2 text-sm text-boutique-muted">
              <input type="radio" name="povod" value="" defaultChecked={!activeOccasion} />
              Всички поводи
            </label>
            {occasionFilters.map((item) => (
              <label key={item.id} className="flex items-center gap-2 text-sm text-boutique-muted">
                <input
                  type="radio"
                  name="povod"
                  value={item.id}
                  defaultChecked={activeOccasion === item.id}
                  className="accent-boutique-sage-deep"
                />
                {item.label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="border-t border-boutique-line pt-4 lg:pt-5">
          <legend className="font-heading text-base text-boutique-ink lg:text-lg">По вид продукт</legend>
          <div className="mt-2.5 space-y-2 lg:mt-3 lg:space-y-2.5">
            <label className="flex items-center gap-2 text-sm text-boutique-muted">
              <input type="radio" name="vid" value="" defaultChecked={!activeProductCategory} />
              Всички продукти
            </label>
            {productCategoryFilters.map((item) => (
              <label key={item.id} className="flex items-center gap-2 text-sm text-boutique-muted">
                <input
                  type="radio"
                  name="vid"
                  value={item.id}
                  defaultChecked={activeProductCategory === item.id}
                  className="accent-boutique-sage-deep"
                />
                {item.label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="border-t border-boutique-line pt-4 lg:pt-5">
          <legend className="font-heading text-base text-boutique-ink lg:text-lg">Цена</legend>
          <div className="mt-2.5 space-y-2 lg:mt-3 lg:space-y-2.5">
            <label className="flex items-center gap-2 text-sm text-boutique-muted">
              <input type="radio" name="price" value="" defaultChecked={!activePrice} />
              Всички цени
            </label>
            {priceFilters.map((item) => (
              <label key={item.id} className="flex items-center gap-2 text-sm text-boutique-muted">
                <input
                  type="radio"
                  name="price"
                  value={item.id}
                  defaultChecked={activePrice === item.id}
                  className="accent-boutique-sage-deep"
                />
                {item.label}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="flex items-start gap-2 border-t border-boutique-line pt-4 text-sm text-boutique-muted lg:pt-5">
          <input
            type="checkbox"
            name="personalization"
            value="only"
            defaultChecked={personalizationOnly}
            className="mt-0.5 accent-boutique-sage-deep"
          />
          Само продукти с персонализация
        </label>

        <label className="flex items-start gap-2 text-sm text-boutique-muted">
          <input
            type="checkbox"
            name="promotions"
            value="only"
            defaultChecked={promotionsOnly}
            className="mt-0.5 accent-boutique-sage-deep"
          />
          Само промоции
        </label>

        <div className="sticky bottom-2 z-10 -mx-2 flex gap-2 border-t border-boutique-line bg-boutique-paper/95 px-2 py-3 shadow-[0_-12px_24px_-20px_rgb(44_40_37_/0.45)] backdrop-blur transition-shadow duration-300 ease-out lg:bottom-4 lg:-mx-3 lg:px-3 motion-reduce:transition-none">
          <button
            type="submit"
            className="flex-1 rounded-lg bg-boutique-sage-deep px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition duration-200 ease-out hover:-translate-y-1 hover:bg-boutique-accent hover:shadow-[0_12px_24px_-10px_rgb(44_40_37_/0.18)] active:translate-y-0 active:shadow-sm lg:py-3 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            Приложи
          </button>
          <Link
            href={`${PRODUCT_INDEX_PATH}#product-grid`}
            className="rounded-lg border border-boutique-line bg-boutique-paper px-4 py-2.5 text-sm font-semibold text-boutique-ink transition duration-200 ease-out hover:-translate-y-1 hover:border-boutique-sage-deep hover:text-boutique-sage-deep hover:shadow-[0_12px_24px_-10px_rgb(44_40_37_/0.14)] active:translate-y-0 active:shadow-sm lg:py-3 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            Изчисти
          </Link>
        </div>
      </>
    );
  }

  return (
    <div>
      <VisualPageHero
        eyebrow={
          <>
            <Link href="/" className="hover:underline">Начало</Link>
            <span className="px-2" aria-hidden>›</span>
            Продукти
          </>
        }
        title={content["shop.hero_title"]}
        description={content["shop.hero_description"]}
        descriptionAs="h2"
        imageSrc={heroImage.src}
        imageAlt={heroImage.alt}
      />

      <section id="product-grid" className="bg-white py-10 md:py-14">
        <PageContainer>
          <form className="mb-3 flex gap-2 sm:mb-6">
            <input type="hidden" name="vid" value={activeProductCategory} />
            <input type="hidden" name="povod" value={activeOccasion} />
            <input type="hidden" name="price" value={activePrice} />
            <input type="hidden" name="sort" value={activeSort} />
            {personalizationOnly ? (
              <input type="hidden" name="personalization" value="only" />
            ) : null}
            {promotionsOnly ? (
              <input type="hidden" name="promotions" value="only" />
            ) : null}
            <label className="min-w-0 flex-1">
              <span className="sr-only">Търсене на продукт</span>
              <input
                name="q"
                defaultValue={query}
                type="search"
                placeholder={content["shop.search_placeholder"]}
                className="w-full rounded-xl border border-boutique-line bg-boutique-paper px-3 py-2.5 text-sm text-boutique-ink shadow-boutique-sm outline-none transition duration-200 ease-out focus:border-boutique-sage focus:ring-2 focus:ring-boutique-sage/15 sm:px-4 sm:py-3 motion-reduce:transition-none"
              />
            </label>
            <button
              type="submit"
              className="shrink-0 rounded-xl bg-boutique-sage-deep px-3 py-2.5 text-sm font-semibold text-white transition duration-200 ease-out hover:-translate-y-1 hover:bg-boutique-ink hover:shadow-[0_12px_24px_-10px_rgb(44_40_37_/0.18)] active:translate-y-0 active:shadow-sm sm:px-6 sm:py-3 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              Търси
            </button>
          </form>

          <details className="mb-4 rounded-xl border border-boutique-line bg-boutique-paper p-3 sm:mb-6 sm:p-4 lg:hidden">
            <summary className="cursor-pointer py-0.5 font-semibold text-boutique-ink">
              Филтри
            </summary>
            <form className="mt-4 space-y-4">
              <FilterFields />
            </form>
          </details>

          <div className="grid gap-8 lg:grid-cols-[17rem_minmax(0,1fr)]">
            <aside className="hidden lg:block">
              <form className="relative space-y-5 rounded-xl border border-boutique-line bg-boutique-paper p-5 shadow-boutique-sm transition-shadow duration-300 ease-out hover:shadow-boutique motion-reduce:transition-none">
                <div className="flex items-center justify-between">
                  <h2 className="font-heading text-xl text-boutique-ink">Филтри</h2>
                  <Link href={`${PRODUCT_INDEX_PATH}#product-grid`} className="text-xs text-boutique-sage-deep hover:underline">
                    Изчисти
                  </Link>
                </div>
                <FilterFields />
              </form>
            </aside>

            <div>
              <div className="flex flex-col justify-between gap-3 border-b border-boutique-line pb-4 sm:flex-row sm:items-center sm:gap-4 sm:pb-5">
                <div>
                  <p className="text-sm text-boutique-muted">
                    Показани <span className="font-semibold text-boutique-ink">{filtered.length}</span> от{" "}
                    <span className="font-semibold text-boutique-ink">{products.length}</span> продукта
                  </p>
                  {activeChips.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {activeChips.map((chip) => (
                        <span key={chip} className="rounded-full bg-boutique-warm px-3 py-1 text-xs text-boutique-ink">
                          {chip}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                <form className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <input type="hidden" name="q" value={query} />
                  <input type="hidden" name="vid" value={activeProductCategory} />
                  <input type="hidden" name="povod" value={activeOccasion} />
                  <input type="hidden" name="price" value={activePrice} />
                  {personalizationOnly ? <input type="hidden" name="personalization" value="only" /> : null}
                  {promotionsOnly ? <input type="hidden" name="promotions" value="only" /> : null}
                  <label className="flex min-w-0 flex-1 items-center text-sm text-boutique-muted sm:flex-none">
                    <span className="shrink-0">Сортиране:</span>
                    <select
                      name="sort"
                      defaultValue={activeSort}
                      className="ml-2 min-w-0 flex-1 rounded-lg border border-boutique-line bg-boutique-paper px-2 py-2 text-sm text-boutique-ink sm:flex-none sm:px-3"
                    >
                      <option value="featured">Най-нови</option>
                      <option value="price-asc">Цена: ниска към висока</option>
                      <option value="price-desc">Цена: висока към ниска</option>
                      <option value="name-asc">Име: А-Я</option>
                      <option value="name-desc">Име: Я-А</option>
                    </select>
                  </label>
                  <button type="submit" className="rounded-lg bg-boutique-sage-deep px-3 py-2.5 text-xs font-semibold text-white sm:py-2">
                    Готово
                  </button>
                </form>
              </div>

              {filtered.length === 0 ? (
                <p className="mt-10 rounded-xl border border-dashed border-boutique-line p-10 text-center text-sm text-boutique-muted">
                  Няма продукти по избраните критерии.
                </p>
              ) : (
                <div className="mt-4 grid grid-cols-2 gap-2 sm:mt-6 sm:gap-5 xl:grid-cols-3">
                  {filtered.map((product) => (
                    <ProductCard key={product.id} product={product} variant="catalog" />
                  ))}
                </div>
              )}
            </div>
          </div>
        </PageContainer>
      </section>
    </div>
  );
}
