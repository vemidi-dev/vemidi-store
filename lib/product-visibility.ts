export const PRODUCT_VISIBILITIES = ["public", "upsell_only"] as const;

export type ProductVisibility = (typeof PRODUCT_VISIBILITIES)[number];

export const DEFAULT_PRODUCT_VISIBILITY: ProductVisibility = "public";

export const PRODUCT_VISIBILITY_LABELS: Record<ProductVisibility, string> = {
  public: "В магазина",
  upsell_only: "Само като добавка",
};

export function isProductVisibility(value: unknown): value is ProductVisibility {
  return (
    typeof value === "string" &&
    (PRODUCT_VISIBILITIES as readonly string[]).includes(value)
  );
}

export function normalizeProductVisibility(
  value: unknown,
  fallback: ProductVisibility = DEFAULT_PRODUCT_VISIBILITY,
): ProductVisibility {
  return isProductVisibility(value) ? value : fallback;
}

export function isProductCatalogVisible(
  visibility: ProductVisibility | null | undefined,
): boolean {
  return normalizeProductVisibility(visibility) === "public";
}

export function isProductUpsellTargetVisible(
  visibility: ProductVisibility | null | undefined,
): boolean {
  const normalized = normalizeProductVisibility(visibility);
  return normalized === "public" || normalized === "upsell_only";
}

export function filterCatalogVisibleProducts<
  T extends { visibility?: ProductVisibility | null },
>(products: T[]): T[] {
  return products.filter((product) => isProductCatalogVisible(product.visibility));
}
