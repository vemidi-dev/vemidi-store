import type { CartLine } from "@/lib/cart-types";
import { normalizeCartQuantityWithLimit } from "@/lib/cart/quantity-limits";
import {
  getCartLineQuantityTierGroupKey,
  sumQuantityTierGroupTotals,
} from "@/lib/cart/quantity-tier-group";
import { removeCartLineWithLinkedUpsells } from "@/lib/cart/remove-cart-line";
import { resolveCartLineUnitPrice } from "@/lib/product-quantity-pricing";

function applyQuantityTierPrice(
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
