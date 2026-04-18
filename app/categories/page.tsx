import Link from "next/link";

import CategoryShowcaseCard from "@/components/category/category-showcase-card";
import { PageContainer } from "@/components/layout/page-container";
import { PageHero } from "@/components/ui/page-hero";
import type { ShopCategory } from "@/lib/shop-categories";
import { createClient } from "@/lib/supabase/server";

type DbCategory = {
  id: string;
  name: string;
  slug: string;
};

function toShowcaseCategory(category: DbCategory): ShopCategory {
  return {
    slug: category.slug,
    title: category.name,
    imageSrc: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=800&q=80",
    imageAlt: `${category.name} - категория продукти`,
  };
}

export default async function CategoriesPage() {
  let categories: ShopCategory[] = [];
  const supabase = await createClient();

  if (supabase) {
    const { data, error } = await supabase
      .from("categories")
      .select("id,name,slug")
      .order("name", { ascending: true });

    if (!error && data) {
      categories = (data as DbCategory[]).map(toShowcaseCategory);
    }
  }

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
            <Link href="/products" className="font-medium text-boutique-accent underline-offset-4 hover:underline">
              Към магазина
            </Link>
          </p>
        </PageContainer>
      </section>
    </div>
  );
}
