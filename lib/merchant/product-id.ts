import type { Product } from "@/lib/catalog";

export function resolveMerchantProductId(
  product: Pick<Product, "id" | "productCode">,
): string {
  const code = product.productCode?.trim();
  return code || product.id;
}
