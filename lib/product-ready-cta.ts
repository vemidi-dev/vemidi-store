import type { Product } from "@/lib/catalog";

export const DEFAULT_READY_PRODUCT_CTA_LABEL = "Вижте готов вариант";

export type ReadyProductCta = {
  label: string;
  product: Product;
};

export function resolveReadyProductCta(
  product: Pick<
    Product,
    "showReadyProductCta" | "readyProductCtaLabel" | "readyProductCtaProductId"
  >,
  relatedProducts: Product[],
  productsById: Map<string, Product>,
): ReadyProductCta | null {
  if (!product.showReadyProductCta) {
    return null;
  }

  const configuredId = product.readyProductCtaProductId?.trim();
  const target =
    (configuredId ? productsById.get(configuredId) : undefined) ??
    relatedProducts[0] ??
    null;

  if (!target) {
    return null;
  }

  const label =
    product.readyProductCtaLabel?.trim() || DEFAULT_READY_PRODUCT_CTA_LABEL;

  return { label, product: target };
}
