export type ProductQuantityPriceTier = {
  minQuantity: number;
  maxQuantity: number | null;
  unitPrice: number;
};

export function normalizeQuantityPriceTiers(
  value: unknown,
): ProductQuantityPriceTier[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((tier) => {
      if (typeof tier !== "object" || tier === null) {
        return null;
      }

      const record = tier as Record<string, unknown>;
      const minQuantity = Number(record.minQuantity);
      const rawMaxQuantity = record.maxQuantity;
      const maxQuantity =
        rawMaxQuantity === null || rawMaxQuantity === "" || rawMaxQuantity === undefined
          ? null
          : Number(rawMaxQuantity);
      const unitPrice = Number(record.unitPrice);

      if (
        !Number.isFinite(minQuantity) ||
        minQuantity < 1 ||
        !Number.isFinite(unitPrice) ||
        unitPrice < 0 ||
        (maxQuantity !== null && (!Number.isFinite(maxQuantity) || maxQuantity < minQuantity))
      ) {
        return null;
      }

      return {
        minQuantity: Math.trunc(minQuantity),
        maxQuantity: maxQuantity === null ? null : Math.trunc(maxQuantity),
        unitPrice: Math.round(unitPrice * 100) / 100,
      };
    })
    .filter((tier): tier is ProductQuantityPriceTier => tier !== null)
    .sort((left, right) => left.minQuantity - right.minQuantity);
}

export function resolveQuantityUnitPrice(
  baseUnitPrice: number,
  tiers: ProductQuantityPriceTier[] | undefined,
  quantity: number,
) {
  const safeBase = Number.isFinite(baseUnitPrice) ? Math.max(0, baseUnitPrice) : 0;
  const safeQuantity = Number.isFinite(quantity) ? Math.max(1, Math.trunc(quantity)) : 1;
  const matchedTier = (tiers ?? []).find(
    (tier) =>
      safeQuantity >= tier.minQuantity &&
      (tier.maxQuantity === null || safeQuantity <= tier.maxQuantity),
  );

  return matchedTier ? matchedTier.unitPrice : safeBase;
}

export function hasQuantityPriceTiers(
  tiers: ProductQuantityPriceTier[] | undefined,
) {
  return Boolean(tiers?.length);
}
