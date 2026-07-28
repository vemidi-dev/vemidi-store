import { serializeOptionSelectionsForCartLine } from "@/lib/cart-line-id";
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

export function getPreparedVariantPricingGroupKey(
  variant: PreparedVariantPricingInput,
) {
  const personalizationDelta = variant.personalizationDelta ?? 0;
  const optionsKey = serializeOptionSelectionsForCartLine(variant.optionSelections);

  if (optionsKey) {
    return `${optionsKey}::p:${personalizationDelta}`;
  }

  const optionDelta = variant.optionDelta ?? 0;
  return `d:${optionDelta}::p:${personalizationDelta}`;
}

function sumPreparedVariantGroupTotals(variants: PreparedVariantPricingInput[]) {
  const totals = new Map<string, number>();

  for (const variant of variants) {
    const key = getPreparedVariantPricingGroupKey(variant);
    totals.set(key, (totals.get(key) ?? 0) + variant.quantity);
  }

  return totals;
}

/** Unit price for a prepared variant row — tier applies to its pricing group, not color. */
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
) {
  const groupTotals = sumPreparedVariantGroupTotals(variants);

  return variants.map((variant) => {
    const pricingGroupQuantity =
      groupTotals.get(getPreparedVariantPricingGroupKey(variant)) ?? variant.quantity;
    return resolvePreparedVariantUnitPrice(
      baseUnitPrice,
      tiers,
      variant,
      pricingGroupQuantity,
    );
  });
}

export function resolvePreparedVariantsTotalPrice(
  baseUnitPrice: number,
  tiers: ProductQuantityPriceTier[] | undefined,
  variants: PreparedVariantPricingInput[],
) {
  const unitPrices = resolvePreparedVariantsUnitPrices(baseUnitPrice, tiers, variants);
  return roundMoney(
    variants.reduce((total, variant, index) => {
      const unitPrice = unitPrices[index] ?? variant.unitPrice;
      return total + unitPrice * variant.quantity;
    }, 0),
  );
}
