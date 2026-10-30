import type { CartLine } from "@/lib/cart-types";
import { getCartLineQuantityTierGroupKey, sumQuantityTierGroupTotals } from "@/lib/cart/quantity-tier-group";
import { resolveCartLineUnitPrice } from "@/lib/product-quantity-pricing";

export function applyQuantityTierPrice(
  line: CartLine,
  quantity: number,
  tierQuantity = quantity,
): CartLine {
  if (line.upsell || !line.quantityPriceTiers?.length) {
    return { ...line, quantity };
  }

  // Without a stored product base price, applying absolute tier prices would
  // wipe selected option/personalization deltas from an already-final line.price.
  if (
    typeof line.baseUnitPrice !== "number" ||
    !Number.isFinite(line.baseUnitPrice) ||
    line.baseUnitPrice < 0
  ) {
    return { ...line, quantity };
  }

  const optionDelta = line.optionDelta ?? 0;
  const personalizationDelta = line.personalizationDelta ?? 0;
  return {
    ...line,
    quantity,
    price: resolveCartLineUnitPrice(
      line.baseUnitPrice,
      line.quantityPriceTiers,
      tierQuantity,
      optionDelta,
      personalizationDelta,
    ),
  };
}

export function applyQuantityTierPricesForProduct(
  lines: CartLine[],
  productId: string,
): CartLine[] {
  const productLines = lines.filter(
    (line) => line.productId === productId && !line.upsell,
  );
  if (productLines.length === 0) {
    return lines;
  }

  const groupTotals = sumQuantityTierGroupTotals(productLines);

  return lines.map((line) => {
    if (line.productId !== productId || line.upsell) {
      return line;
    }

    const groupKey = getCartLineQuantityTierGroupKey(line);
    if (!groupKey) {
      return line;
    }

    const tierQuantity = groupTotals.get(groupKey) ?? line.quantity;
    return applyQuantityTierPrice(line, line.quantity, tierQuantity);
  });
}

