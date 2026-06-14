import { MAX_CART_QUANTITY } from "@/lib/cart-storage";

export function resolveCartQuantityLimit(maxCartQuantity?: number | null): number {
  if (
    typeof maxCartQuantity === "number" &&
    Number.isFinite(maxCartQuantity) &&
    maxCartQuantity >= 0
  ) {
    return Math.min(MAX_CART_QUANTITY, Math.floor(maxCartQuantity));
  }

  return MAX_CART_QUANTITY;
}

export function normalizeCartQuantityWithLimit(
  value: number,
  maxCartQuantity?: number | null,
): number {
  const limit = resolveCartQuantityLimit(maxCartQuantity);
  if (!Number.isFinite(value)) {
    return 0;
  }

  const parsed = Math.floor(value);
  if (parsed < 1) {
    return 0;
  }

  return Math.min(limit, parsed);
}

export function isCartQuantityAtLimit(
  quantity: number,
  maxCartQuantity?: number | null,
): boolean {
  const limit = resolveCartQuantityLimit(maxCartQuantity);
  return (
    typeof maxCartQuantity === "number" &&
    Number.isFinite(maxCartQuantity) &&
    maxCartQuantity >= 0 &&
    maxCartQuantity < MAX_CART_QUANTITY &&
    quantity >= limit
  );
}
