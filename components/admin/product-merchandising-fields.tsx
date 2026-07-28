"use client";

import { useState } from "react";

import { RelatedProductPicker } from "@/components/admin/related-product-picker";
import { adminHelperClass } from "@/components/admin/styles";
import { adminFormFields } from "@/lib/admin/form-fields";
import type { CategoryType } from "@/lib/admin/types";
import { DEFAULT_READY_PRODUCT_CTA_LABEL } from "@/lib/product-ready-cta";
import type { PromotionProductOption } from "@/lib/promotion-admin";

type RelatedProductCategoryOption = {
  id: string;
  name: string;
  categoryType: CategoryType;
};

type ProductMerchandisingFieldsProps = {
  products: PromotionProductOption[];
  categories: RelatedProductCategoryOption[];
  excludeProductId: string;
  selectedRelatedIds: string[];
  isFeatured: boolean;
  homeSortOrder: number;
  showReadyProductCta: boolean;
  readyProductCtaLabel: string;
  readyProductCtaProductId: string | null;
};

export function ProductMerchandisingFields({
  products,
  categories,
  excludeProductId,
  selectedRelatedIds,
  isFeatured,
  homeSortOrder,
  showReadyProductCta,
  readyProductCtaLabel,
  readyProductCtaProductId,
}: ProductMerchandisingFieldsProps) {
  const [readyCtaEnabled, setReadyCtaEnabled] = useState(showReadyProductCta);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
      <div className="space-y-5">
        <div className="rounded-xl border border-boutique-line bg-boutique-bg p-4">
          <label className="flex items-start gap-3 text-sm font-medium text-boutique-ink">
            <input
              name={adminFormFields.merchandising.isFeatured}
              type="checkbox"
              defaultChecked={isFeatured}
              className="mt-0.5 h-4 w-4 rounded border-boutique-line text-boutique-accent focus-visible:ring-2 focus-visible:ring-boutique-accent/30"
            />
            <span>
              Покажи на началната страница
              <span className="mt-1 block text-xs font-normal leading-relaxed text-boutique-muted">
                Продуктът ще се появи в секцията „Избрани подаръци“.
              </span>
            </span>
          </label>

          <label className="mt-4 block text-sm font-medium text-boutique-ink">
            Позиция
            <input
              name={adminFormFields.merchandising.homeSortOrder}
              type="number"
              min="0"
              step="10"
              defaultValue={homeSortOrder}
              className="mt-2 w-28 rounded-lg border border-boutique-line bg-white px-3 py-2 focus-visible:ring-2 focus-visible:ring-boutique-accent/20"
            />
            <span className="mt-1 block text-xs font-normal text-boutique-muted">
              По-малкото число се показва по-напред.
            </span>
          </label>
        </div>
      </div>

      <div className="space-y-5">
        <div className="rounded-xl border border-boutique-line bg-boutique-bg p-4">
          <p className="text-sm font-medium text-boutique-ink">Свързани продукти</p>
          <p className="mt-1 text-xs leading-relaxed text-boutique-muted">
            Изберете готови или свързани продукти, които да се показват като линкове на
            продуктовата страница.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-boutique-muted">
            Филтрирайте по категория, заготовки/материали или повод и използвайте bulk
            бутона за всички продукти от текущия филтър.
          </p>

          <div className="mt-3">
            <RelatedProductPicker
              products={products}
              categories={categories}
              excludeProductId={excludeProductId}
              selectedRelatedIds={selectedRelatedIds}
            />
          </div>
        </div>

        <div className="rounded-xl border border-boutique-line bg-boutique-bg p-4">
          <p className="text-sm font-medium text-boutique-ink">Готов вариант</p>
          <p className="mt-1 text-xs leading-relaxed text-boutique-muted">
            Настройте CTA бутона „Виж готов вариант“ и изберете целевия продукт.
          </p>

          <label className="mt-4 flex items-start gap-3 text-sm font-medium text-boutique-ink">
            <input
              name={adminFormFields.merchandising.showReadyProductCta}
              type="checkbox"
              defaultChecked={showReadyProductCta}
              onChange={(event) => setReadyCtaEnabled(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-boutique-line text-boutique-accent focus-visible:ring-2 focus-visible:ring-boutique-accent/30"
            />
            <span>
              Покажи CTA „Виж готов вариант“
              <span className="mt-1 block text-xs font-normal leading-relaxed text-boutique-muted">
                По подразбиране е изключено. Включете го само когато искате да насочите към
                готов продукт.
              </span>
            </span>
          </label>

          <label className="mt-4 block text-sm font-medium text-boutique-ink">
            Текст на CTA
            <input
              name={adminFormFields.merchandising.readyProductCtaLabel}
              type="text"
              defaultValue={readyProductCtaLabel || DEFAULT_READY_PRODUCT_CTA_LABEL}
              placeholder={DEFAULT_READY_PRODUCT_CTA_LABEL}
              disabled={!readyCtaEnabled}
              className="mt-2 w-full rounded-lg border border-boutique-line bg-white px-3 py-2 focus-visible:ring-2 focus-visible:ring-boutique-accent/20 disabled:opacity-50"
            />
          </label>

          <div className="mt-4">
            <p className="text-sm font-medium text-boutique-ink">Целеви продукт</p>
            <p className={adminHelperClass}>
              Ако не изберете конкретен продукт, се използва първият от свързаните.
            </p>
            <div className="mt-3">
              <RelatedProductPicker
                mode="single"
                products={products}
                categories={categories}
                excludeProductId={excludeProductId}
                selectedProductId={readyProductCtaProductId}
                hiddenFieldName={adminFormFields.merchandising.readyProductCtaProductId}
                disabled={!readyCtaEnabled}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
