export type DiscountType = "percentage" | "fixed_price";

export type ProductPromotionSnapshot = {
  id: string;
  name: string;
  discountType: DiscountType;
  discountValue: number;
  endsAt: string;
  label: string;
};

export type ProductPromotionRow = {
  id: string;
  product_id: string;
  name: string;
  discount_type: DiscountType;
  discount_value: number;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  created_at: string;
};

export function isPromotionActive(
  promotion: Pick<ProductPromotionRow, "is_active" | "starts_at" | "ends_at">,
  at: Date = new Date(),
): boolean {
  if (!promotion.is_active) {
    return false;
  }

  const timestamp = at.getTime();
  return (
    new Date(promotion.starts_at).getTime() <= timestamp &&
    new Date(promotion.ends_at).getTime() > timestamp
  );
}

export function calculateEffectivePrice(
  basePrice: number,
  discountType: DiscountType,
  discountValue: number,
): number {
  if (!Number.isFinite(basePrice) || basePrice < 0) {
    return basePrice;
  }

  let effective =
    discountType === "percentage"
      ? Math.round(basePrice * (1 - discountValue / 100) * 100) / 100
      : Math.round(discountValue * 100) / 100;

  effective = Math.max(0, effective);
  if (effective >= basePrice) {
    return basePrice;
  }

  return effective;
}

export function getPromotionLabel(
  discountType: DiscountType,
  discountValue: number,
  basePrice: number,
  effectivePrice: number,
): string {
  if (discountType === "percentage") {
    return `-${Math.round(discountValue)}%`;
  }

  if (basePrice > 0 && effectivePrice < basePrice) {
    const percent = Math.round((1 - effectivePrice / basePrice) * 100);
    return percent > 0 ? `-${percent}%` : "Промо";
  }

  return "Промо";
}

export function resolveProductPricing(
  basePrice: number,
  promotion: ProductPromotionRow | null | undefined,
  at: Date = new Date(),
): {
  price: number;
  compareAtPrice: number | null;
  promotion: ProductPromotionSnapshot | null;
} {
  if (!promotion || !isPromotionActive(promotion, at)) {
    return {
      price: basePrice,
      compareAtPrice: null,
      promotion: null,
    };
  }

  const effectivePrice = calculateEffectivePrice(
    basePrice,
    promotion.discount_type,
    Number(promotion.discount_value),
  );

  if (effectivePrice >= basePrice) {
    return {
      price: basePrice,
      compareAtPrice: null,
      promotion: null,
    };
  }

  return {
    price: effectivePrice,
    compareAtPrice: basePrice,
    promotion: {
      id: promotion.id,
      name: promotion.name,
      discountType: promotion.discount_type,
      discountValue: Number(promotion.discount_value),
      endsAt: promotion.ends_at,
      label: getPromotionLabel(
        promotion.discount_type,
        Number(promotion.discount_value),
        basePrice,
        effectivePrice,
      ),
    },
  };
}

export function isProductOnPromotion(product: {
  price: number;
  compareAtPrice?: number | null;
}): boolean {
  return (
    typeof product.compareAtPrice === "number" &&
    product.compareAtPrice > product.price
  );
}
