import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";
import { ProductCard } from "@/components/product/product-card";
import { PageHero } from "@/components/ui/page-hero";
import type { Product } from "@/lib/catalog";
import { shopCategories } from "@/lib/shop-categories";
import { createClient } from "@/lib/supabase/server";

const categoryLabelBySlug = Object.fromEntries(
  shopCategories.map((c) => [c.slug, c.title]),
) as Record<string, string>;

type ProductsPageProps = {
  searchParams: Promise<{ category?: string | string[] }>;
};

type StorefrontProductRow = {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  is_customizable: boolean;
};

function toStorefrontProduct(row: StorefrontProductRow): Product {
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
          "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=80",
        alt: row.name,
      },
    ],
  };
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const raw = params.category;
  const categorySlug = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  let activeLabel = categorySlug && categoryLabelBySlug[categorySlug] ? categoryLabelBySlug[categorySlug] : null;
  let items: Product[] = [];

  const supabase = await createClient();
  if (supabase) {
    const { data: categoriesData, error: categoriesError } = await supabase
      .from("categories")
      .select("id,name,slug");

    if (!categoriesError && categoriesData) {
      const selectedCategory =
        categorySlug ? categoriesData.find((category) => category.slug === categorySlug) : null;

      if (selectedCategory) {
        activeLabel = selectedCategory.name;

        const { data: relationsData, error: relationsError } = await supabase
          .from("product_categories")
          .select("product_id")
          .eq("category_id", selectedCategory.id);

        if (!relationsError) {
          const productIds = Array.from(
            new Set((relationsData ?? []).map((relation) => relation.product_id).filter(Boolean)),
          );

          if (productIds.length === 0) {
            items = [];
          } else {
            const { data: productsData, error: productsError } = await supabase
              .from("products")
              .select("id,name,description,price,image_url,is_customizable,created_at")
              .in("id", productIds)
              .order("created_at", { ascending: false });

            if (!productsError && productsData) {
              items = (productsData as StorefrontProductRow[]).map(toStorefrontProduct);
            }
          }
        }
      } else if (categorySlug) {
        // Unknown category slug in DB: return empty list with slug label.
        activeLabel = activeLabel ?? categorySlug;
        items = [];
      } else {
        const { data: productsData, error: productsError } = await supabase
          .from("products")
          .select("id,name,description,price,image_url,is_customizable,created_at")
          .order("created_at", { ascending: false });

        if (!productsError && productsData) {
          items = (productsData as StorefrontProductRow[]).map(toStorefrontProduct);
        }
      }
    }
  }

  return (
    <div>
      <PageHero
        eyebrow="Ателиер"
        title="Магазин"
        description="Демо каталог с внимание към материала и формата. Скоре тук ще се връзват реални данни от Supabase или CMS."
      />

      <section className="pb-20 pt-4 md:pb-28">
        <PageContainer>
          {activeLabel ? (
            <div className="mb-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-boutique-accent/20 bg-boutique-warm/40 px-5 py-4">
              <p className="text-sm text-boutique-ink">
                <span className="text-boutique-muted">Категория: </span>
                <span className="font-semibold">{activeLabel}</span>
              </p>
              <Link
                href="/products"
                className="text-xs font-semibold uppercase tracking-wider text-boutique-accent underline-offset-4 transition hover:text-boutique-ink hover:underline"
              >
                Изчисти филтъра
              </Link>
            </div>
          ) : null}

          <p className="mb-8 text-center text-sm text-boutique-muted">
            Цените са в <span className="font-medium text-boutique-ink">евро (€)</span>, с включен ДДС.
          </p>

          <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-2">
            {items.map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </div>
          {items.length === 0 ? (
            <p className="mt-10 text-center text-sm text-boutique-muted">
              Няма налични продукти{activeLabel ? " за тази категория" : ""}.
            </p>
          ) : null}
        </PageContainer>
      </section>
    </div>
  );
}
