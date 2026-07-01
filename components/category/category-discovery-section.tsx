import CategoryShowcaseCard from "@/components/category/category-showcase-card";
import { PageContainer } from "@/components/layout/page-container";
import { toShowcaseCategory } from "@/lib/storefront/mappers";
import type { StorefrontCategory } from "@/lib/storefront/types";

type CategoryDiscoverySectionProps = {
  subcategories: StorefrontCategory[];
  relatedCategories: StorefrontCategory[];
};

const sectionHeadingClassName =
  "font-heading text-xl text-boutique-ink md:text-2xl";

const cardGridClassName =
  "mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:flex lg:flex-wrap lg:gap-4";

const cardWrapperClassName = "lg:w-[11.5rem] lg:shrink-0";

export function CategoryDiscoverySection({
  subcategories,
  relatedCategories,
}: CategoryDiscoverySectionProps) {
  const hasSubcategories = subcategories.length > 0;
  const hasRelated = relatedCategories.length > 0;

  if (!hasSubcategories && !hasRelated) {
    return null;
  }

  const showSideBySide = hasSubcategories && hasRelated;

  return (
    <section className="border-b border-boutique-line bg-boutique-paper py-5 md:py-6">
      <PageContainer>
        <div
          className={
            showSideBySide
              ? "grid gap-6 md:grid-cols-2 md:items-start md:gap-8"
              : "grid gap-6"
          }
        >
          {hasSubcategories ? (
            <div>
              <h2 className={sectionHeadingClassName}>Подкатегории</h2>
              <div className={cardGridClassName}>
                {subcategories.map((category) => (
                  <div key={category.id} className={cardWrapperClassName}>
                    <CategoryShowcaseCard
                      category={toShowcaseCategory(category)}
                      compact
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {hasRelated ? (
            <div>
              <h2 className={sectionHeadingClassName}>Още идеи</h2>
              <div className={cardGridClassName}>
                {relatedCategories.map((category) => (
                  <div key={category.id} className={cardWrapperClassName}>
                    <CategoryShowcaseCard
                      category={toShowcaseCategory(category)}
                      compact
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </PageContainer>
    </section>
  );
}
