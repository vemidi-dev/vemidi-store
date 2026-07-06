import type { CartLine } from "@/lib/cart-types";
import { normalizeCartQuantityWithLimit } from "@/lib/cart/quantity-limits";
import { removeCartLineWithLinkedUpsells } from "@/lib/cart/remove-cart-line";

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
    return lines.map((entry) =>
      entry.lineId === lineId ? { ...entry, quantity: nextQuantity } : entry,
    );
  }

  const previousSourceQuantity = Math.max(1, line.quantity);

  return lines.map((entry) => {
    if (entry.lineId === lineId) {
      return { ...entry, quantity: nextQuantity };
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
  });
}
