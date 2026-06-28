"use client";

import { RelatedProductPicker } from "@/components/admin/related-product-picker";
import { adminFormFields } from "@/lib/admin/form-fields";
import type { PromotionProductOption } from "@/lib/promotion-admin";

type RelatedProductCategoryOption = {
  id: string;
  name: string;
  categoryType: "product" | "occasion";
};

type ProductMerchandisingFieldsProps = {
  products: PromotionProductOption[];
  categories: RelatedProductCategoryOption[];
  excludeProductId: string;
  selectedRelatedIds: string[];
  isFeatured: boolean;
  homeSortOrder: number;
};

export function ProductMerchandisingFields({
  products,
  categories,
  excludeProductId,
  selectedRelatedIds,
  isFeatured,
  homeSortOrder,
}: ProductMerchandisingFieldsProps) {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
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

      <div className="rounded-xl border border-boutique-line bg-boutique-bg p-4">
        <p className="text-sm font-medium text-boutique-ink">Свързани продукти</p>
        <p className="mt-1 text-xs leading-relaxed text-boutique-muted">
          Изберете до 8 продукта. Те ще се покажат в зададения тук ред.
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
    </div>
  );
}
