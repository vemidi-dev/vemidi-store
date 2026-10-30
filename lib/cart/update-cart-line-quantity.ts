import type { CartLine } from "@/lib/cart-types";
import { normalizeCartQuantityWithLimit } from "@/lib/cart/quantity-limits";
import { removeCartLineWithLinkedUpsells } from "@/lib/cart/remove-cart-line";
import { applyQuantityTierPrice, applyQuantityTierPricesForProduct } from "@/lib/cart/apply-quantity-tier-prices";
export { applyQuantityTierPricesForProduct } from "@/lib/cart/apply-quantity-tier-prices";

function resolveUpsellMaxQuantityPerSource(
  line: CartLine,
  previousSourceQuantity: number,
): number | undefined {
  const explicit = line.upsell?.maxQuantityPerSource;
  if (typeof explicit === "number" && Number.isFinite(explicit) && explicit >= 1) {
    return Math.floor(explicit);
  }

  if (
    typeof line.maxCartQuantity === "number" &&
    Number.isFinite(line.maxCartQuantity) &&
    line.maxCartQuantity >= 1 &&
    previousSourceQuantity >= 1
  ) {
    return Math.max(1, Math.floor(line.maxCartQuantity / previousSourceQuantity));
  }

  return undefined;
}

export function updateCartLineQuantityWithLinkedUpsells(
  lines: CartLine[],
  lineId: string,
  quantity: number,
): CartLine[] {
  const line = lines.find((entry) => entry.lineId === lineId);
  const nextQuantity = normalizeCartQuantityWithLimit(quantity, line?.maxCartQuantity);
  if (nextQuantity === 0) {
    return removeCartLineWithLinkedUpsells(lines, lineId);
  }

  if (!line || line.upsell) {
    const updatedLines = lines.map((entry) =>
      entry.lineId === lineId ? applyQuantityTierPrice(entry, nextQuantity) : entry,
    );
    return line
      ? applyQuantityTierPricesForProduct(updatedLines, line.productId)
      : updatedLines;
  }

  const previousSourceQuantity = Math.max(1, line.quantity);

  return applyQuantityTierPricesForProduct(lines.map((entry) => {
    if (entry.lineId === lineId) {
      return applyQuantityTierPrice(entry, nextQuantity);
    }

    if (entry.upsell?.sourceProductId !== line.productId) {
      return entry;
    }

    const maxQuantityPerSource = resolveUpsellMaxQuantityPerSource(
      entry,
      previousSourceQuantity,
    );
    if (!maxQuantityPerSource) {
      return entry;
    }

    const nextMaxCartQuantity = maxQuantityPerSource * nextQuantity;
    return {
      ...entry,
      maxCartQuantity: nextMaxCartQuantity,
      upsell: {
        ...entry.upsell,
        maxQuantityPerSource,
      },
      quantity: normalizeCartQuantityWithLimit(
        entry.quantity,
        nextMaxCartQuantity,
      ),
    };
  }), line.productId);
}
