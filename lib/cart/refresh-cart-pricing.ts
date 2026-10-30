import type { CartLine } from "@/lib/cart-types";
import type { ProductQuantityPriceTier } from "@/lib/product-quantity-pricing";
import { resolveCartLineUnitPrice } from "@/lib/product-quantity-pricing";
import { getCartLineQuantityTierGroupKey, sumQuantityTierGroupTotals } from "@/lib/cart/quantity-tier-group";

export type CartProductPricing = {
  productId: string;
  baseUnitPrice: number;
  quantityPriceTiers: ProductQuantityPriceTier[];
};

/** Refresh base prices without replacing quantities or selected extras. */
export function refreshCartPricing(lines: CartLine[], prices: CartProductPricing[]): CartLine[] {
  const byId = new Map(prices.map(price => [price.productId, price]));
  const totals = sumQuantityTierGroupTotals(lines);
  let changed = false;
  const updated = lines.map(line => {
    const pricing = byId.get(line.productId);
    // Legacy lines without pricing metadata may include unknown surcharges.
    if (!pricing || line.upsell || typeof line.baseUnitPrice !== "number") return line;
    const key = getCartLineQuantityTierGroupKey(line);
    const price = resolveCartLineUnitPrice(pricing.baseUnitPrice, pricing.quantityPriceTiers,
      (key && totals.get(key)) || line.quantity, line.optionDelta, line.personalizationDelta);
    if (line.price === price && line.baseUnitPrice === pricing.baseUnitPrice &&
      JSON.stringify(line.quantityPriceTiers ?? []) === JSON.stringify(pricing.quantityPriceTiers)) return line;
    changed = true;
    return {...line, ...pricing, price};
  });
  return changed ? updated : lines;
}
