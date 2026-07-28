import type { CartLine } from "@/lib/cart-types";
import { serializeOptionSelectionsForCartLine } from "@/lib/cart-line-id";

/** Quantity tiers apply per purchasable variant — material/size/options, not color. */
export function getCartLineQuantityTierGroupKey(
  line: Pick<
    CartLine,
    "productId" | "optionSelections" | "optionDelta" | "personalizationDelta" | "upsell"
  >,
): string | null {
  if (line.upsell) {
    return null;
  }

  const personalizationDelta = line.personalizationDelta ?? 0;
  const optionsKey = serializeOptionSelectionsForCartLine(line.optionSelections);

  if (optionsKey) {
    return `${line.productId}::${optionsKey}::p:${personalizationDelta}`;
  }

  const optionDelta = line.optionDelta ?? 0;
  return `${line.productId}::d:${optionDelta}::p:${personalizationDelta}`;
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
