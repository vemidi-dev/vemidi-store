"use client";

import { useMemo, useState } from "react";

import { createPromotionCampaign } from "@/app/admin/promotion-actions";
import { PromotionCampaignPreview } from "@/components/admin/promotion-campaign-preview";
import { PromotionProductPicker } from "@/components/admin/promotion-product-picker";
import {
  adminAccordionClass,
  adminAccordionSummaryClass,
  adminFieldClass,
} from "@/components/admin/styles";
import { adminFormFields } from "@/lib/admin/form-fields";
import type { PromotionProductOption } from "@/lib/promotion-admin";
import type { ProductPromotionRow } from "@/lib/product-pricing";

type PromotionCategoryOption = {
  id: string;
  name: string;
  categoryType: "product" | "occasion";
};

export function PromotionCampaignCreateForm({
  products,
  categories,
  existingPromotions,
}: {
  products: PromotionProductOption[];
  categories: PromotionCategoryOption[];
  existingPromotions: ProductPromotionRow[];
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [name, setName] = useState("");
  const [discountValue, setDiscountValue] = useState("10");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [isActive, setIsActive] = useState(true);

  const discountNumber = useMemo(() => Number(discountValue.replace(",", ".")), [discountValue]);

  return (
    <details className={`${adminAccordionClass} mt-5`}>
      <summary
        className={adminAccordionSummaryClass}
        aria-label="Нова промоционална кампания — формуляр"
      >
        <span className="font-heading text-lg text-boutique-ink">Нова кампания</span>
        <span className="text-sm font-normal text-boutique-muted" aria-hidden>
          Формуляр
        </span>
      </summary>

      <form
        action={createPromotionCampaign}
        className="space-y-5 border-t border-boutique-line/80 px-4 pb-4 pt-4 sm:px-5 sm:pb-5"
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <div className="grid content-start gap-4">
            <label className="text-sm font-medium text-boutique-ink">
              Име на кампанията
              <input
                name={adminFormFields.promotion.name}
                required
                maxLength={160}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Напр. Лятна кампания"
                className={adminFieldClass}
              />
            </label>
            <label className="text-sm font-medium text-boutique-ink">
              Отстъпка за всички избрани продукти
              <div className="relative">
                <input
                  name={adminFormFields.promotion.discountValue}
                  type="number"
                  min="0.01"
                  max="100"
                  step="0.01"
                  required
                  value={discountValue}
                  onChange={(event) => setDiscountValue(event.target.value)}
                  className={`${adminFieldClass} pr-10`}
                />
                <span className="pointer-events-none absolute right-4 top-1/2 mt-1 text-sm text-boutique-muted">
                  %
                </span>
              </div>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium text-boutique-ink">
                Начало
                <input
                  name={adminFormFields.promotion.startsAt}
                  type="datetime-local"
                  required
                  value={startsAt}
                  onChange={(event) => setStartsAt(event.target.value)}
                  className={adminFieldClass}
                />
              </label>
              <label className="text-sm font-medium text-boutique-ink">
                Край
                <input
                  name={adminFormFields.promotion.endsAt}
                  type="datetime-local"
                  required
                  value={endsAt}
                  onChange={(event) => setEndsAt(event.target.value)}
                  className={adminFieldClass}
                />
              </label>
            </div>
            <label className="inline-flex items-center gap-2 text-sm font-medium text-boutique-ink">
              <input
                name={adminFormFields.promotion.isActive}
                type="checkbox"
                checked={isActive}
                onChange={(event) => setIsActive(event.target.checked)}
                className="h-4 w-4 rounded border-boutique-line"
              />
              Активирай кампанията
            </label>
          </div>

          <PromotionProductPicker
            products={products}
            categories={categories}
            selectedIds={selectedIds}
            onSelectedIdsChange={setSelectedIds}
          />
        </div>

        <PromotionCampaignPreview
          name={name}
          discountPercentage={discountNumber}
          startsAt={startsAt}
          endsAt={endsAt}
          isActive={isActive}
          selectedIds={selectedIds}
          products={products}
          existingPromotions={existingPromotions}
        />

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-boutique-line pt-4">
          <p className="text-xs text-boutique-muted">
            Крайната цена се изчислява сървърно. Припокриващи се активни промоции се блокират от
            базата.
          </p>
          <button
            disabled={selectedIds.size === 0}
            className="rounded-full bg-boutique-ink px-6 py-3 text-xs font-semibold uppercase tracking-wider text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Създай кампания ({selectedIds.size})
          </button>
        </div>
      </form>
    </details>
  );
}
