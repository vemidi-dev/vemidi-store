import CategoryShowcaseCard from "@/components/category/category-showcase-card";
import { PageContainer } from "@/components/layout/page-container";
import { toShowcaseCategory } from "@/lib/storefront/mappers";
import type { StorefrontCategory } from "@/lib/storefront/types";

type CategoryDiscoverySectionProps = {
  subcategories: StorefrontCategory[];
  relatedCategories: StorefrontCategory[];
};

export function CategoryDiscoverySection({
  subcategories,
  relatedCategories,
}: CategoryDiscoverySectionProps) {
  const hasSubcategories = subcategories.length > 0;
  const hasRelated = relatedCategories.length > 0;

  if (!hasSubcategories && !hasRelated) {
    return null;
  }

  return (
    <section className="border-b border-boutique-line bg-boutique-paper py-5 md:py-6">
      <PageContainer>
        {hasSubcategories ? (
          <h2 className="font-heading text-xl text-boutique-ink md:text-2xl">
            Подкатегории
          </h2>
        ) : (
          <p className="text-sm font-medium text-boutique-muted">
            Още подходящи идеи
          </p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:flex lg:flex-wrap lg:gap-4">
          {subcategories.map((category) => (
            <div key={category.id} className="lg:w-[11.5rem] lg:shrink-0">
              <CategoryShowcaseCard
                category={toShowcaseCategory(category)}
                compact
              />
            </div>
          ))}

          {hasSubcategories && hasRelated ? (
            <p className="col-span-full pt-1 text-sm font-medium text-boutique-muted lg:basis-full">
              Още подходящи идеи
            </p>
          ) : null}

          {relatedCategories.map((category) => (
            <div key={category.id} className="lg:w-[11.5rem] lg:shrink-0">
              <CategoryShowcaseCard
                category={toShowcaseCategory(category)}
                compact
              />
            </div>
          ))}
        </div>
      </PageContainer>
    </section>
  );
}
