import type {
  WishTemplateOccasionRow,
  WishTemplateRow,
} from "@/lib/admin/types";

export type WishActiveFilter = "all" | "active" | "inactive";
export type WishOccasionFilter = "all" | "unassigned" | string;
export type WishSortKey = "body-asc" | "body-desc" | "order-asc" | "order-desc";

export function truncateWishBody(body: string, maxLength = 120): string {
  const normalized = body.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

export function getWishOccasionIds(
  wishId: string,
  links: WishTemplateOccasionRow[],
): string[] {
  return links
    .filter((link) => link.wish_template_id === wishId)
    .map((link) => link.category_id);
}

export function filterWishTemplates(
  wishes: WishTemplateRow[],
  links: WishTemplateOccasionRow[],
  {
    search,
    occasion,
    active,
  }: {
    search: string;
    occasion: WishOccasionFilter;
    active: WishActiveFilter;
  },
): WishTemplateRow[] {
  const normalizedSearch = search.trim().toLocaleLowerCase("bg");

  return wishes.filter((wish) => {
    const occasionIds = getWishOccasionIds(wish.id, links);

    if (active === "active" && !wish.is_active) {
      return false;
    }
    if (active === "inactive" && wish.is_active) {
      return false;
    }

    if (occasion === "unassigned" && occasionIds.length > 0) {
      return false;
    }
    if (occasion !== "all" && occasion !== "unassigned" && !occasionIds.includes(occasion)) {
      return false;
    }

    if (
      normalizedSearch &&
      !wish.body.toLocaleLowerCase("bg").includes(normalizedSearch) &&
      !wish.title.toLocaleLowerCase("bg").includes(normalizedSearch)
    ) {
      return false;
    }

    return true;
  });
}

export function sortWishTemplates(
  wishes: WishTemplateRow[],
  sortKey: WishSortKey,
): WishTemplateRow[] {
  const sorted = [...wishes];

  sorted.sort((left, right) => {
    if (sortKey === "order-asc") {
      return left.sort_order - right.sort_order;
    }
    if (sortKey === "order-desc") {
      return right.sort_order - left.sort_order;
    }
    if (sortKey === "body-desc") {
      return right.body.localeCompare(left.body, "bg");
    }
    return left.body.localeCompare(right.body, "bg");
  });

  return sorted;
}
