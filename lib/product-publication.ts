export const PRODUCT_PUBLICATION_STATUSES = [
  "draft",
  "published",
  "archived",
] as const;

export type ProductPublicationStatus = (typeof PRODUCT_PUBLICATION_STATUSES)[number];

export const DEFAULT_PRODUCT_PUBLICATION_STATUS: ProductPublicationStatus = "draft";

export const PRODUCT_PUBLICATION_STATUS_LABELS: Record<
  ProductPublicationStatus,
  string
> = {
  draft: "Чернова",
  published: "Публикуван",
  archived: "Архивиран",
};

export function isProductPublicationStatus(
  value: unknown,
): value is ProductPublicationStatus {
  return (
    typeof value === "string" &&
    (PRODUCT_PUBLICATION_STATUSES as readonly string[]).includes(value)
  );
}

export function normalizeProductPublicationStatus(
  value: unknown,
  fallback: ProductPublicationStatus = DEFAULT_PRODUCT_PUBLICATION_STATUS,
): ProductPublicationStatus {
  return isProductPublicationStatus(value) ? value : fallback;
}

export function isProductStorefrontPublished(
  status: ProductPublicationStatus | null | undefined,
): boolean {
  return status === "published";
}

export function filterStorefrontPublishedProducts<
  T extends { status?: ProductPublicationStatus | null },
>(products: T[]): T[] {
  return products.filter((product) =>
    isProductStorefrontPublished(product.status ?? "published"),
  );
}

export function filterStorefrontPublishedProductIds(
  productIds: string[],
  publishedProductIds: ReadonlySet<string>,
): string[] {
  return productIds.filter((productId) => publishedProductIds.has(productId));
}
