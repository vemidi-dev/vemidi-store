import type { CartLine } from "@/lib/cart-types";

/** All regular variants of one product share the quantity tier. */
export function getCartLineQuantityTierGroupKey(
  line: Pick<
    CartLine,
    "productId" | "optionSelections" | "optionDelta" | "personalizationDelta" | "upsell"
  >,
): string | null {
  if (line.upsell) {
    return null;
  }

  return line.productId;
}

export function sumQuantityTierGroupTotals(lines: CartLine[]): Map<string, number> {
  const totals = new Map<string, number>();

  for (const line of lines) {
    const key = getCartLineQuantityTierGroupKey(line);
    if (!key) {
      continue;
    }

    totals.set(key, (totals.get(key) ?? 0) + line.quantity);
  }

  return totals;
}
