import type { Product } from "@/lib/catalog";
import type { ProductOptionGroup, ProductOptionValue } from "@/lib/product-options";

export function productHasMaterialOptionValues(groups: ProductOptionGroup[]): boolean {
  return groups.some((group) =>
    group.values.some((value) => value.isActive && Boolean(value.material)),
  );
}

export function productUsesStockConfiguratorLayout(
  product: Pick<Product, "fulfillmentType" | "allowQuantitySelector">,
): boolean {
  return (
    product.fulfillmentType === "stocked" || Boolean(product.allowQuantitySelector)
  );
}

/** Stocked/quantity products or products with linked material variants. */
export function shouldUseMaterialOptionCards(
  product: Pick<Product, "fulfillmentType" | "allowQuantitySelector">,
  groups: ProductOptionGroup[],
): boolean {
  return (
    productUsesStockConfiguratorLayout(product) ||
    productHasMaterialOptionValues(groups)
  );
}

export function optionValueSupportsMaterialCard(value: ProductOptionValue): boolean {
  return Boolean(value.material);
}
