"use client";

import { useMemo } from "react";

import { formatEur } from "@/lib/format-eur";
import {
  analyzeCampaignSelection,
  isValidPercentageDiscount,
  validatePromotionPeriod,
  type PromotionProductOption,
} from "@/lib/promotion-admin";
import type { ProductPromotionRow } from "@/lib/product-pricing";

type PromotionCampaignPreviewProps = {
  name: string;
  discountPercentage: number;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  selectedIds: Set<string>;
  products: PromotionProductOption[];
  existingPromotions: ProductPromotionRow[];
};

export function PromotionCampaignPreview({
  name,
  discountPercentage,
  startsAt,
  endsAt,
  isActive,
  selectedIds,
  products,
  existingPromotions,
}: PromotionCampaignPreviewProps) {
  const periodError = useMemo(() => {
    if (!startsAt || !endsAt) {
      return "Въведете начална и крайна дата.";
    }
    return validatePromotionPeriod(
      new Date(startsAt).toISOString(),
      new Date(endsAt).toISOString(),
    );
  }, [endsAt, startsAt]);

  const analysis = useMemo(() => {
    if (!startsAt || !endsAt || periodError) {
      return { issues: [], samplePrices: [] };
    }

    return analyzeCampaignSelection({
      products,
      selectedIds,
      discountPercentage,
      period: {
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        isActive,
      },
      existingPromotions,
    });
  }, [
    discountPercentage,
    endsAt,
    existingPromotions,
    isActive,
    periodError,
    products,
    selectedIds,
    startsAt,
  ]);

  const invalidPrices = analysis.issues.filter((issue) => issue.reason === "invalid_price");
  const overlaps = analysis.issues.filter((issue) => issue.reason === "overlap");

  return (
    <section className="rounded-xl border border-boutique-line bg-white p-4">
      <h3 className="text-sm font-semibold text-boutique-ink">Преглед преди запис</h3>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-boutique-muted">Кампания</dt>
          <dd className="font-medium text-boutique-ink">{name.trim() || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-boutique-muted">Отстъпка</dt>
          <dd className="font-medium text-boutique-ink">
            {isValidPercentageDiscount(discountPercentage)
              ? `-${discountPercentage}%`
              : "Невалидна стойност"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-boutique-muted">Период</dt>
          <dd className="text-boutique-ink">
            {startsAt && endsAt
              ? `${new Date(startsAt).toLocaleString("bg-BG")} – ${new Date(endsAt).toLocaleString("bg-BG")}`
              : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-boutique-muted">Продукти</dt>
          <dd className="font-medium text-boutique-ink">{selectedIds.size}</dd>
        </div>
      </dl>

      {analysis.samplePrices.length > 0 ? (
        <div className="mt-4 border-t border-boutique-line/70 pt-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-boutique-muted">
            Примерни цени
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {analysis.samplePrices.map((sample) => (
              <li key={sample.productId} className="flex flex-wrap items-baseline gap-2">
                <span className="text-boutique-ink">{sample.productName}</span>
                <span className="text-boutique-muted line-through">
                  {formatEur(sample.basePrice)}
                </span>
                <span className="font-medium text-boutique-accent">
                  {formatEur(sample.effectivePrice)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {periodError ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {periodError}
        </p>
      ) : null}

      {invalidPrices.length > 0 ? (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          <p className="font-semibold">Невалидна крайна цена за {invalidPrices.length} продукта.</p>
          <p className="mt-1">
            {invalidPrices
              .slice(0, 5)
              .map((issue) => issue.productName)
              .join(", ")}
            {invalidPrices.length > 5 ? "..." : ""}
          </p>
        </div>
      ) : null}

      {overlaps.length > 0 ? (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <p className="font-semibold">
            Припокриване с активна промоция за {overlaps.length} продукта.
          </p>
          <p className="mt-1">
            Правило: активните промоции не могат да се припокриват за един и същ продукт в
            същия период. Най-новата запис остава в сила само ако няма конфликт при създаване.
          </p>
          <ul className="mt-2 space-y-1">
            {overlaps.slice(0, 5).map((issue) => (
              <li key={issue.productId}>
                {issue.productName}: {issue.overlapWith?.join(", ")}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
