export const PRODUCT_SORT_ORDER_STEP = 10;

export type ProductOrderScope = "home" | "catalog";

export function normalizeProductSortOrders(
  count: number,
  step = PRODUCT_SORT_ORDER_STEP,
): number[] {
  return Array.from({ length: count }, (_, index) => (index + 1) * step);
}

export function buildProductOrderSavePayload(productIds: string[]) {
  return productIds.map((productId, index) => ({
    productId,
    sortOrder: (index + 1) * PRODUCT_SORT_ORDER_STEP,
  }));
}

export function moveItemInList<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length ||
    fromIndex === toIndex
  ) {
    return items;
  }

  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export function moveItemUp<T>(items: T[], index: number): T[] {
  if (index <= 0) {
    return items;
  }
  return moveItemInList(items, index, index - 1);
}

export function moveItemDown<T>(items: T[], index: number): T[] {
  if (index < 0 || index >= items.length - 1) {
    return items;
  }
  return moveItemInList(items, index, index + 1);
}

export function moveItemToTop<T>(items: T[], index: number): T[] {
  if (index <= 0) {
    return items;
  }
  return moveItemInList(items, index, 0);
}

export function moveItemToBottom<T>(items: T[], index: number): T[] {
  if (index < 0 || index >= items.length - 1) {
    return items;
  }
  return moveItemInList(items, index, items.length - 1);
}

export function compareHomeFeaturedSortOrder(
  left: { sortOrder: number; name: string },
  right: { sortOrder: number; name: string },
): number {
  const orderDifference = left.sortOrder - right.sortOrder;
  return orderDifference || left.name.localeCompare(right.name, "bg");
}

export function compareCatalogSortOrder<
  T extends {
    catalogSortOrder: number;
    createdAt?: string | null;
    id: string;
  },
>(left: T, right: T): number {
  const leftRank =
    left.catalogSortOrder > 0
      ? left.catalogSortOrder
      : Number.MAX_SAFE_INTEGER;
  const rightRank =
    right.catalogSortOrder > 0
      ? right.catalogSortOrder
      : Number.MAX_SAFE_INTEGER;

  if (leftRank !== rightRank) {
    return leftRank - rightRank;
  }

  const leftCreatedAt = left.createdAt ? Date.parse(left.createdAt) : 0;
  const rightCreatedAt = right.createdAt ? Date.parse(right.createdAt) : 0;
  return rightCreatedAt - leftCreatedAt || left.id.localeCompare(right.id);
}

export function parseOrderedProductIds(values: FormDataEntryValue[]): string[] {
  const seen = new Set<string>();
  const productIds: string[] = [];

  for (const value of values) {
    const productId = String(value ?? "").trim();
    if (!productId || seen.has(productId)) {
      continue;
    }
    seen.add(productId);
    productIds.push(productId);
  }

  return productIds;
}
