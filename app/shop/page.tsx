import Image from "next/image";
import Link from "next/link";

import { ProductCard } from "@/components/product/product-card";
import { PageContainer } from "@/components/layout/page-container";
import type { Product } from "@/lib/catalog";
import { createClient } from "@/lib/supabase/server";

type ShopPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type Category = {
  id: string;
  name: string;
  slug: string;
};

type FilterValue = {
  id: string;
  label: string;
};

type DbProduct = {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  is_customizable: boolean;
};

type DbRelation = {
  product_id: string;
  category_id: string;
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

function toProduct(row: DbProduct): Product {
  return {
    slug: row.id,
    title: row.name,
    description: row.description,
    price: Number(row.price),
    customizable: row.is_customizable,
    images: [
      {
        src:
          row.image_url ??
          "https://images.unsplash.com/photo-1511988617509-a57c8a288659?auto=format&fit=crop&w=1200&q=80",
        alt: row.name,
      },
    ],
  };
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const params = await searchParams;
  const query = firstValue(params.q).trim();
  const activeCategory = firstValue(params.category);
  const activePrice = firstValue(params.price);
  const activeSort = firstValue(params.sort) || "featured";
  const personalizationOnly = firstValue(params.personalization) === "only";

  let categories: Category[] = [];
  let products: Product[] = [];
  const categoryIdsByProductId = new Map<string, string[]>();
  const categoryById = new Map<string, Category>();

  const supabase = await createClient();
  if (supabase) {
    const [{ data: productsData }, { data: categoriesData }, { data: relationsData }] = await Promise.all([
      supabase
        .from("products")
        .select("id,name,description,price,image_url,is_customizable,created_at")
        .order("created_at", { ascending: false }),
      supabase.from("categories").select("id,name,slug").order("name", { ascending: true }),
      supabase.from("product_categories").select("product_id,category_id"),
    ]);

    categories = (categoriesData ?? []) as Category[];
    products = ((productsData ?? []) as DbProduct[]).map(toProduct);

    categories.forEach((category) => {
      categoryById.set(category.id, category);
    });

    ((relationsData ?? []) as DbRelation[]).forEach((relation) => {
      const existing = categoryIdsByProductId.get(relation.product_id) ?? [];
      existing.push(relation.category_id);
      categoryIdsByProductId.set(relation.product_id, existing);
    });
  }

  const categoryFilters: FilterValue[] = categories.map((category) => ({
    id: category.slug,
    label: category.name,
  }));
  const priceFilters: FilterValue[] = [
    { id: "under-60", label: "До 60 EUR" },
    { id: "60-100", label: "60-100 EUR" },
    { id: "over-100", label: "Над 100 EUR" },
  ];

  const state = {
    q: query,
    category: activeCategory,
    price: activePrice,
    sort: activeSort,
    personalization: personalizationOnly ? "only" : "",
  };

  const allItems = products.map((product, index) => {
    const categoryIds = categoryIdsByProductId.get(product.slug) ?? [];
    const categorySlugs = categoryIds
      .map((categoryId) => categoryById.get(categoryId)?.slug)
      .filter((slug): slug is string => Boolean(slug));
    return { ...product, index, categorySlugs };
  });
  const featured = allItems.slice(0, 3);

  let filtered = allItems.filter((product) => {
    const text = `${product.title} ${product.description}`.toLowerCase();
    const matchesQuery = query ? text.includes(query.toLowerCase()) : true;
    const matchesCategory = activeCategory ? product.categorySlugs.includes(activeCategory) : true;
    const matchesPersonalization = personalizationOnly ? Boolean(product.customizable) : true;
    const matchesPrice = activePrice ? getPriceBucket(product.price) === activePrice : true;

    return matchesQuery && matchesCategory && matchesPersonalization && matchesPrice;
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
    activeCategory
      ? `Категория: ${categoryFilters.find((item) => item.id === activeCategory)?.label ?? activeCategory}`
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
              Gift Shop
            </p>
            <h1 className="font-heading text-4xl leading-tight tracking-tight text-boutique-ink sm:text-5xl">
              Магазин за подаръци, които пазят спомени
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-boutique-muted">
              Разгледайте реалните продукти, добавени в ателието, и филтрирайте по категория и
              персонализация.
            </p>
            <form className="flex flex-col gap-3 rounded-2xl border border-boutique-line/80 bg-white p-4 shadow-boutique-sm sm:flex-row">
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
              <Image
                src="https://images.unsplash.com/photo-1511988617509-a57c8a288659?auto=format&fit=crop&w=1200&q=80"
                alt="Опакован ръчно изработен подарък с панделка"
                fill
                sizes="(max-width: 768px) 100vw, 45vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-boutique-ink/70 via-boutique-ink/25 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-boutique-paper/80">
                  Gift Builder
                </p>
                <h2 className="mt-2 font-heading text-3xl text-boutique-paper">Create your gift</h2>
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
                Featured
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
                Product Grid
              </p>
              <h2 className="font-heading mt-3 text-3xl text-boutique-ink">Всички продукти</h2>
            </div>
            <p className="text-sm text-boutique-muted">
              Намерени: <span className="font-semibold text-boutique-ink">{filtered.length}</span>
            </p>
          </div>

          <form className="mt-8 grid gap-3 rounded-2xl border border-boutique-line bg-boutique-paper p-5 md:grid-cols-5">
            <input type="hidden" name="q" value={query} />

            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-boutique-muted">
              Категория
              <select
                name="category"
                defaultValue={activeCategory}
                className="mt-2 w-full rounded-lg border border-boutique-line bg-white px-3 py-2 text-sm text-boutique-ink"
              >
                <option value="">Всички</option>
                {categoryFilters.map((item) => (
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
