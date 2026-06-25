import Link from "next/link";

import { getCategoryListingHref } from "@/lib/category-url";
import type { StorefrontCategory } from "@/lib/storefront/types";

type ProductDetailOccasionTagsProps = {
  occasions: Pick<StorefrontCategory, "name" | "slug" | "category_type">[];
};

export function ProductDetailOccasionTags({ occasions }: ProductDetailOccasionTagsProps) {
  if (occasions.length === 0) {
    return null;
  }

  return (
    <div className="mt-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-boutique-muted">
        Подходящ за
      </p>
      <ul className="mt-2.5 flex flex-wrap gap-2">
        {occasions.map((occasion) => (
          <li key={occasion.slug}>
            <Link
              href={getCategoryListingHref(occasion)}
              className="inline-flex rounded-full border border-boutique-line bg-white px-3 py-1 text-sm font-medium text-boutique-ink transition hover:border-boutique-sage-deep/40 hover:text-boutique-sage-deep motion-reduce:transition-none"
            >
              {occasion.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
