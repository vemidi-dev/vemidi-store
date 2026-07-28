import {
  resolveQuantityUnitPrice,
  type ProductQuantityPriceTier,
} from "@/lib/product-quantity-pricing";

export type PreparedVariantPricingInput = {
  quantity: number;
  unitPrice: number;
};

/** Unit price for a prepared variant row — tier applies to that row's quantity only. */
export function resolvePreparedVariantUnitPrice(
  baseUnitPrice: number,
  tiers: ProductQuantityPriceTier[] | undefined,
  variant: PreparedVariantPricingInput,
) {
  const tierBaseUnitPrice = resolveQuantityUnitPrice(
    baseUnitPrice,
    tiers,
    variant.quantity,
  );
  const variantDelta = Math.max(0, variant.unitPrice - tierBaseUnitPrice);
  return tierBaseUnitPrice + variantDelta;
}

export function resolvePreparedVariantsTotalPrice(
  baseUnitPrice: number,
  tiers: ProductQuantityPriceTier[] | undefined,
  variants: PreparedVariantPricingInput[],
) {
  return variants.reduce(
    (total, variant) =>
      total +
      resolvePreparedVariantUnitPrice(baseUnitPrice, tiers, variant) * variant.quantity,
    0,
  );
}
