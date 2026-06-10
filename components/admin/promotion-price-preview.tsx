"use client";

import { useMemo } from "react";

import { formatEur } from "@/lib/format-eur";
import {
  calculateEffectivePrice,
  getPromotionLabel,
  type DiscountType,
} from "@/lib/product-pricing";

type PromotionPricePreviewProps = {
  basePrice: number;
  discountType: DiscountType;
  discountValue: number;
};

export function PromotionPricePreview({
  basePrice,
  discountType,
  discountValue,
}: PromotionPricePreviewProps) {
  const preview = useMemo(() => {
    if (!Number.isFinite(basePrice) || basePrice < 0 || !Number.isFinite(discountValue)) {
      return null;
    }

    const effectivePrice = calculateEffectivePrice(basePrice, discountType, discountValue);
    if (effectivePrice >= basePrice) {
      return {
        effectivePrice: basePrice,
        label: null as string | null,
        onPromotion: false,
      };
    }

    return {
      effectivePrice,
      label: getPromotionLabel(discountType, discountValue, basePrice, effectivePrice),
      onPromotion: true,
    };
  }, [basePrice, discountType, discountValue]);

  if (!preview) {
    return (
      <p className="text-xs text-boutique-muted">
        Изберете продукт и стойност, за да видите preview на цената.
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-boutique-line bg-white px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-boutique-muted">
        Preview
      </p>
      <div className="mt-1 flex flex-wrap items-baseline gap-2">
        {preview.onPromotion ? (
          <>
            <span className="text-sm text-boutique-muted line-through">
              {formatEur(basePrice)}
            </span>
            <span className="font-heading text-lg text-boutique-accent">
              {formatEur(preview.effectivePrice)}
            </span>
            {preview.label ? (
              <span className="rounded-full bg-boutique-accent/10 px-2 py-0.5 text-[10px] font-semibold text-boutique-accent">
                {preview.label}
              </span>
            ) : null}
          </>
        ) : (
          <span className="font-heading text-lg text-boutique-ink">
            {formatEur(basePrice)}
          </span>
        )}
      </div>
    </div>
  );
}
