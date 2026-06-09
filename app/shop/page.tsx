import Link from "next/link";
import type { Metadata } from "next";

import { ProductCard } from "@/components/product/product-card";
import { PageContainer } from "@/components/layout/page-container";
import { MediaPlaceholder } from "@/components/ui/media-placeholder";
import { getStorefrontCatalog } from "@/lib/storefront/repository";

export const metadata: Metadata = {
  title: "Продукти",
  description:
    "Разгледайте ръчно изработени и персонализирани подаръци от VeMiDi crafts.",
  alternates: { canonical: "/shop" },
};

type ShopPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type FilterValue = {
  id: string;
  label: string;
};

function firstValue(value: string | string[] | undefined): string {
  if (!value) {
    return "";
  }
  return Array.isArray(value) ? value[0] ?? "" : value;
}

function buildShopHref(
  current: Record<string, string>,
  overrides: Partial<Record<string, string>>,
  hash = "",
): string {
  const merged = { ...current, ...overrides };
  const params = new URLSearchParams();

  Object.entries(merged).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  const query = params.toString();
  const base = query ? `/shop?${query}` : "/shop";
  return hash ? `${base}${hash}` : base;
}

function getPriceBucket(price: number): FilterValue["id"] {
  if (price < 60) {
    return "under-60";
  }
  if (price <= 100) {
    return "60-100";
  }
  return "over-100";
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const params = await searchParams;
  const query = firstValue(params.q).trim();
  const legacyCategory = firstValue(params.category);
  const requestedProductCategory = firstValue(params.product);
  const requestedOccasion = firstValue(params.occasion);
  const activePrice = firstValue(params.price);
  const activeSort = firstValue(params.sort) || "featured";
  const personalizationOnly = firstValue(params.personalization) === "only";

  const { categories, products } = await getStorefrontCatalog();

  const productCategoryFilters: FilterValue[] = categories
    .filter((category) => category.category_type === "product")
    .map((category) => ({
      id: category.slug,
      label: category.name,
    }));
  const occasionFilters: FilterValue[] = categories
    .filter((category) => category.category_type === "occasion")
    .map((category) => ({
    id: category.slug,
    label: category.name,
  }));
  const legacyCategoryType = categories.find(
    (category) => category.slug === legacyCategory,
  )?.category_type;
  const activeProductCategory =
    requestedProductCategory ||
    (legacyCategoryType === "product" ? legacyCategory : "");
  const activeOccasion =
    requestedOccasion ||
    (legacyCategoryType === "occasion" ? legacyCategory : "");
  const priceFilters: FilterValue[] = [
    { id: "under-60", label: "До 60 EUR" },
    { id: "60-100", label: "60-100 EUR" },
    { id: "over-100", label: "Над 100 EUR" },
  ];

  const state = {
    q: query,
    product: activeProductCategory,
    occasion: activeOccasion,
    price: activePrice,
    sort: activeSort,
    personalization: personalizationOnly ? "only" : "",
  };

  const allItems = products.map((product, index) => ({ ...product, index }));
  const featured = allItems.slice(0, 3);

  let filtered = allItems.filter((product) => {
    const text = `${product.title} ${product.description}`.toLowerCase();
    const matchesQuery = query ? text.includes(query.toLowerCase()) : true;
    const matchesProductCategory = activeProductCategory
      ? product.categorySlugs.includes(activeProductCategory)
      : true;
    const matchesOccasion = activeOccasion
      ? product.categorySlugs.includes(activeOccasion)
      : true;
    const matchesPersonalization = personalizationOnly ? Boolean(product.customizable) : true;
    const matchesPrice = activePrice ? getPriceBucket(product.price) === activePrice : true;

    return matchesQuery && matchesProductCategory && matchesOccasion && matchesPersonalization && matchesPrice;
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
    query ? `Търсене: "${query}"` : "",
  ].filter(Boolean);

  return (
    <div>
      <section className="border-b border-boutique-line bg-boutique-paper">
        <PageContainer className="grid items-center gap-10 py-14 md:grid-cols-[1.08fr_0.92fr] md:py-20">
          <div className="space-y-7">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-boutique-accent">
              Магазин
            </p>
            <h1 className="font-heading text-4xl leading-tight tracking-tight text-boutique-ink sm:text-5xl">
              Магазин за подаръци, които пазят спомени
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-boutique-muted">
              Разгледайте реалните продукти, добавени в ателието, и комбинирайте филтрите по вид,
              повод и персонализация.
            </p>
            <form className="flex flex-col gap-3 rounded-2xl border border-boutique-line/80 bg-white p-4 shadow-boutique-sm sm:flex-row">
              <input type="hidden" name="product" value={activeProductCategory} />
              <input type="hidden" name="occasion" value={activeOccasion} />
              <input type="hidden" name="price" value={activePrice} />
              <input type="hidden" name="sort" value={activeSort} />
              {personalizationOnly ? <input type="hidden" name="personalization" value="only" /> : null}
              <input
                name="q"
                defaultValue={query}
                placeholder="Търси подарък, повод или идея..."
                className="w-full rounded-xl border border-boutique-line bg-boutique-bg px-4 py-3 text-sm text-boutique-ink outline-none transition placeholder:text-boutique-muted/70 focus:border-boutique-accent/40 focus:ring-2 focus:ring-boutique-accent/10"
              />
              <button
                type="submit"
                className="rounded-xl bg-boutique-ink px-6 py-3 text-sm font-semibold text-boutique-paper transition hover:bg-boutique-accent"
              >
                Търси
              </button>
            </form>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-boutique-line bg-boutique-bg px-3 py-1 text-xs text-boutique-muted">
                Ръчна изработка
              </span>
              <span className="rounded-full border border-boutique-line bg-boutique-bg px-3 py-1 text-xs text-boutique-muted">
                Персонализиране
              </span>
              <span className="rounded-full border border-boutique-line bg-boutique-bg px-3 py-1 text-xs text-boutique-muted">
                Подарък с емоция
              </span>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-boutique-line bg-boutique-bg shadow-boutique-sm">
            <div className="relative aspect-[4/3]">
              <MediaPlaceholder label="Снимка за магазина" dark />
              <div className="absolute inset-0 bg-gradient-to-t from-boutique-ink/70 via-boutique-ink/25 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-boutique-paper/80">
                  Персонализация
                </p>
                <h2 className="mt-2 font-heading text-3xl text-boutique-paper">
                  Създайте личен подарък
                </h2>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-boutique-paper/90">
                  Създай персонален подарък с име, дата или кратко послание.
                </p>
                <Link
                  href={buildShopHref(state, { personalization: "only" }, "#product-grid")}
                  className="mt-5 inline-flex rounded-full bg-boutique-paper px-6 py-3 text-sm font-semibold text-boutique-ink transition hover:bg-white"
                >
                  Започни сега
                </Link>
              </div>
            </div>
          </div>
        </PageContainer>
      </section>

      <section className="border-b border-boutique-line bg-boutique-bg py-8">
        <PageContainer>
          <div className="grid gap-3 md:grid-cols-2">
            <Link
              href="#featured-grid"
              className="rounded-xl border border-boutique-line bg-boutique-paper px-4 py-3 text-sm font-medium text-boutique-ink transition hover:border-boutique-accent/40"
            >
              Избрани продукти ▸
            </Link>
            <Link
              href="#product-grid"
              className="rounded-xl border border-boutique-line bg-boutique-paper px-4 py-3 text-sm font-medium text-boutique-ink transition hover:border-boutique-accent/40"
            >
              По продукт ▸
            </Link>
          </div>
        </PageContainer>
      </section>

      <section id="featured-grid" className="border-b border-boutique-line bg-boutique-bg py-14 md:py-16">
        <PageContainer>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-boutique-accent">
                Подбрани
              </p>
              <h2 className="font-heading mt-3 text-3xl text-boutique-ink">Избрани продукти</h2>
            </div>
            <Link
              href={buildShopHref(state, {}, "#product-grid")}
              className="text-sm font-medium text-boutique-accent underline-offset-4 hover:underline"
            >
              Виж всички
            </Link>
          </div>
          {featured.length === 0 ? (
            <p className="mt-8 text-sm text-boutique-muted">Няма добавени продукти.</p>
          ) : (
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {featured.map((product) => (
                <ProductCard key={`featured-${product.slug}`} product={product} />
              ))}
            </div>
          )}
        </PageContainer>
      </section>

      <section id="product-grid" className="py-14 md:py-16">
        <PageContainer>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-boutique-accent">
                Каталог
              </p>
              <h2 className="font-heading mt-3 text-3xl text-boutique-ink">Всички продукти</h2>
            </div>
            <p className="text-sm text-boutique-muted">
              Намерени: <span className="font-semibold text-boutique-ink">{filtered.length}</span>
            </p>
          </div>

          <form className="mt-8 grid gap-3 rounded-2xl border border-boutique-line bg-boutique-paper p-5 md:grid-cols-6">
            <input type="hidden" name="q" value={query} />

            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-boutique-muted">
              Вид продукт
              <select
                name="product"
                defaultValue={activeProductCategory}
                className="mt-2 w-full rounded-lg border border-boutique-line bg-white px-3 py-2 text-sm text-boutique-ink"
              >
                <option value="">Всички</option>
                {productCategoryFilters.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-boutique-muted">
              Повод
              <select
                name="occasion"
                defaultValue={activeOccasion}
                className="mt-2 w-full rounded-lg border border-boutique-line bg-white px-3 py-2 text-sm text-boutique-ink"
              >
                <option value="">Всички поводи</option>
                {occasionFilters.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-boutique-muted">
              Цена
              <select
                name="price"
                defaultValue={activePrice}
                className="mt-2 w-full rounded-lg border border-boutique-line bg-white px-3 py-2 text-sm text-boutique-ink"
              >
                <option value="">Всички цени</option>
                {priceFilters.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-boutique-muted">
              Сортиране
              <select
                name="sort"
                defaultValue={activeSort}
                className="mt-2 w-full rounded-lg border border-boutique-line bg-white px-3 py-2 text-sm text-boutique-ink"
              >
                <option value="featured">Най-нови</option>
                <option value="price-asc">Цена: ниска към висока</option>
                <option value="price-desc">Цена: висока към ниска</option>
                <option value="name-asc">Име: А-Я</option>
                <option value="name-desc">Име: Я-А</option>
              </select>
            </label>

            <div className="space-y-3">
              <label className="inline-flex items-center gap-2 pt-6 text-sm text-boutique-ink">
                <input
                  type="checkbox"
                  name="personalization"
                  value="only"
                  defaultChecked={personalizationOnly}
                  className="h-4 w-4 rounded border-boutique-line text-boutique-accent"
                />
                С персонализация
              </label>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full rounded-full bg-boutique-ink px-4 py-2.5 text-sm font-semibold text-boutique-paper transition hover:bg-boutique-accent"
              >
                Филтрирай
              </button>
            </div>
          </form>

          {activeChips.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {activeChips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-boutique-line bg-boutique-bg px-3 py-1 text-xs text-boutique-ink"
                >
                  {chip}
                </span>
              ))}
              <Link
                href="/shop#product-grid"
                className="rounded-full border border-boutique-accent/40 bg-boutique-paper px-3 py-1 text-xs font-semibold text-boutique-accent transition hover:bg-boutique-bg"
              >
                Изчисти
              </Link>
            </div>
          ) : null}

          {filtered.length === 0 ? (
            <p className="mt-10 text-center text-sm text-boutique-muted">
              Няма продукти по тези критерии. Добавете реални продукти от админ панела.
            </p>
          ) : (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((product) => (
                <ProductCard key={product.slug} product={product} />
              ))}
            </div>
          )}
        </PageContainer>
      </section>
    </div>
  );
}
