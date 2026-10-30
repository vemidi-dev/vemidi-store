import type { CartLine } from "@/lib/cart-types";
import { applyQuantityTierPricesForProduct } from "@/lib/cart/apply-quantity-tier-prices";

export function removeCartLineWithLinkedUpsells(
  lines: CartLine[],
  lineId: string,
): CartLine[] {
  const removedLine = lines.find((line) => line.lineId === lineId);
  if (!removedLine) {
    return lines;
  }

  if (removedLine.upsell) {
    return lines.filter((line) => line.lineId !== lineId);
  }

  return applyQuantityTierPricesForProduct(lines.filter(
    (line) =>
      line.lineId !== lineId &&
      line.upsell?.sourceProductId !== removedLine.productId,
  ), removedLine.productId);
}
