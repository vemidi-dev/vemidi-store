import CategoryShowcaseCard from "@/components/category/category-showcase-card";
import { PageContainer } from "@/components/layout/page-container";
import { toShowcaseCategory } from "@/lib/storefront/mappers";
import type { StorefrontCategory } from "@/lib/storefront/types";

type CategoryRelatedSectionProps = {
  categories: StorefrontCategory[];
};

export function CategoryRelatedSection({
  categories,
}: CategoryRelatedSectionProps) {
  if (categories.length === 0) {
    return null;
  }

  return (
    <section className="border-b border-boutique-line bg-boutique-bg/40 py-8 md:py-12">
      <PageContainer>
        <div className="max-w-3xl">
          <h2 className="font-heading text-2xl text-boutique-ink md:text-3xl">
            Свързани категории
          </h2>
          <p className="mt-2 text-sm text-boutique-muted">
            Още подходящи идеи от каталога.
          </p>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
          {categories.map((category) => (
            <CategoryShowcaseCard
              key={category.id}
              category={toShowcaseCategory(category)}
              compact
            />
          ))}
        </div>
      </PageContainer>
    </section>
  );
}
