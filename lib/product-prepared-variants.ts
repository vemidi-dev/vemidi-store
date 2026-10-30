import type { ProductOptionSelection } from "@/lib/product-options";
import {
  resolveQuantityUnitPrice,
  type ProductQuantityPriceTier,
} from "@/lib/product-quantity-pricing";

export type PreparedVariantPricingInput = {
  quantity: number;
  unitPrice: number;
  optionSelections?: ProductOptionSelection[];
  optionDelta?: number;
  personalizationDelta?: number;
};

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function resolvePreparedVariantDelta(
  baseUnitPrice: number,
  tiers: ProductQuantityPriceTier[] | undefined,
  variant: PreparedVariantPricingInput,
) {
  const perLineTierBaseUnitPrice = resolveQuantityUnitPrice(
    baseUnitPrice,
    tiers,
    variant.quantity,
  );
  const personalizationDelta = variant.personalizationDelta ?? 0;
  const inferredOptionDelta = Math.max(
    0,
    roundMoney(variant.unitPrice - perLineTierBaseUnitPrice - personalizationDelta),
  );

  return {
    optionDelta: variant.optionDelta ?? inferredOptionDelta,
    personalizationDelta,
  };
}

/** Select the product-wide tier, retaining this variant's own surcharges. */
export function resolvePreparedVariantUnitPrice(
  baseUnitPrice: number,
  tiers: ProductQuantityPriceTier[] | undefined,
  variant: PreparedVariantPricingInput,
  pricingGroupQuantity = variant.quantity,
) {
  const { optionDelta, personalizationDelta } = resolvePreparedVariantDelta(
    baseUnitPrice,
    tiers,
    variant,
  );
  const tierBaseUnitPrice = resolveQuantityUnitPrice(
    baseUnitPrice,
    tiers,
    pricingGroupQuantity,
  );
  return roundMoney(tierBaseUnitPrice + optionDelta + personalizationDelta);
}

export function resolvePreparedVariantsUnitPrices(
  baseUnitPrice: number,
  tiers: ProductQuantityPriceTier[] | undefined,
  variants: PreparedVariantPricingInput[],
  quantityAlreadyInCart = 0,
) {
  const productQuantity = variants.reduce((total, variant) => total + variant.quantity, quantityAlreadyInCart);

  return variants.map((variant) => {
    return resolvePreparedVariantUnitPrice(
      baseUnitPrice,
      tiers,
      variant,
      productQuantity,
    );
  });
}

export function resolvePreparedVariantsTotalPrice(
  baseUnitPrice: number,
  tiers: ProductQuantityPriceTier[] | undefined,
  variants: PreparedVariantPricingInput[],
  quantityAlreadyInCart = 0,
) {
  const unitPrices = resolvePreparedVariantsUnitPrices(baseUnitPrice, tiers, variants, quantityAlreadyInCart);
  return roundMoney(
    variants.reduce((total, variant, index) => {
      const unitPrice = unitPrices[index] ?? variant.unitPrice;
      return total + unitPrice * variant.quantity;
    }, 0),
  );
}
