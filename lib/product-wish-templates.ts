import type { WishTemplate, WishTemplateOccasion } from "@/lib/product-personalization";

export type WishTemplateOccasionFilter = "all" | string;

export function buildWishTemplateOccasionFilters(
  templates: Pick<WishTemplate, "occasions">[],
): WishTemplateOccasion[] {
  const byId = new Map<string, WishTemplateOccasion>();

  for (const template of templates) {
    for (const occasion of template.occasions) {
      if (!byId.has(occasion.id)) {
        byId.set(occasion.id, occasion);
      }
    }
  }

  return [...byId.values()].sort((left, right) =>
    left.name.localeCompare(right.name, "bg"),
  );
}

export function shouldShowWishOccasionFilters(
  filters: WishTemplateOccasion[],
): boolean {
  return filters.length > 1;
}

export function filterStorefrontWishTemplates<T extends Pick<WishTemplate, "occasions">>(
  templates: T[],
  occasionFilter: WishTemplateOccasionFilter,
): T[] {
  if (occasionFilter === "all") {
    return templates;
  }

  return templates.filter((template) =>
    template.occasions.some((occasion) => occasion.id === occasionFilter),
  );
}
