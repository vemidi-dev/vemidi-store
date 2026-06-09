import Link from "next/link";
import type { Metadata } from "next";

import CategoryShowcaseCard from "@/components/category/category-showcase-card";
import { PageContainer } from "@/components/layout/page-container";
import { PageHero } from "@/components/ui/page-hero";
import { toShowcaseCategory } from "@/lib/storefront/mappers";
import { getStorefrontCategories } from "@/lib/storefront/repository";

export const metadata: Metadata = {
  title: "Категории",
  description:
    "Открийте подаръци по повод и категория в каталога на VeMiDi crafts.",
  alternates: { canonical: "/categories" },
};

export default async function CategoriesPage() {
  const categories = (await getStorefrontCategories("product")).map(toShowcaseCategory);

  return (
    <div>
      <PageHero
        eyebrow="Каталог"
        title="Категории"
        description="Разгледайте тематичните ни линии и филтрирайте продуктите по категория."
      />
      <section className="pb-20 pt-4">
        <PageContainer>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {categories.map((c) => (
              <CategoryShowcaseCard key={c.slug} category={c} compact />
            ))}
          </div>
          {categories.length === 0 ? (
            <p className="mt-10 text-center text-sm text-boutique-muted">Все още няма категории.</p>
          ) : null}
          <p className="mt-12 text-center text-sm text-boutique-muted">
            <Link href="/shop" className="font-medium text-boutique-accent underline-offset-4 hover:underline">
              Към магазина
            </Link>
          </p>
        </PageContainer>
      </section>
    </div>
  );
}
