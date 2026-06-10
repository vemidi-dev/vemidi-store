"use client";

import { useMemo, useState } from "react";

import { createProductPromotion } from "@/app/admin/promotion-actions";
import { PromotionPricePreview } from "@/components/admin/promotion-price-preview";
import { adminFieldClass } from "@/components/admin/styles";
import { adminFormFields } from "@/lib/admin/form-fields";
import type { ProductRow } from "@/lib/admin/types";
import type { DiscountType } from "@/lib/product-pricing";

export function PromotionCreateForm({ products }: { products: ProductRow[] }) {
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [discountType, setDiscountType] = useState<DiscountType>("percentage");
  const [discountValue, setDiscountValue] = useState("10");

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === productId) ?? null,
    [productId, products],
  );

  const parsedDiscountValue = Number(discountValue.replace(",", "."));

  return (
    <form
      action={createProductPromotion}
      className="mt-4 grid gap-3 rounded-lg border border-boutique-line bg-boutique-bg p-4"
    >
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-xs font-medium text-boutique-ink">
          Продукт
          <select
            name={adminFormFields.promotion.productId}
            required
            value={productId}
            onChange={(event) => setProductId(event.target.value)}
            className={adminFieldClass}
          >
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} ({product.price.toFixed(2)} EUR)
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs font-medium text-boutique-ink">
          Име на промоцията
          <input
            name={adminFormFields.promotion.name}
            required
            placeholder="Напр. Пролетна отстъпка"
            className={adminFieldClass}
          />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-xs font-medium text-boutique-ink">
          Тип намаление
          <select
            name={adminFormFields.promotion.discountType}
            required
            value={discountType}
            onChange={(event) =>
              setDiscountType(event.target.value as DiscountType)
            }
            className={adminFieldClass}
          >
            <option value="percentage">Процент (%)</option>
            <option value="fixed_price">Фиксирана крайна цена (EUR)</option>
          </select>
        </label>

        <label className="text-xs font-medium text-boutique-ink">
          {discountType === "percentage" ? "Процент" : "Крайна цена"}
          <input
            name={adminFormFields.promotion.discountValue}
            required
            inputMode="decimal"
            value={discountValue}
            onChange={(event) => setDiscountValue(event.target.value)}
            placeholder={discountType === "percentage" ? "20" : "24.90"}
            className={adminFieldClass}
          />
        </label>

        <label className="flex items-end gap-2 pb-2 text-xs font-medium text-boutique-ink">
          <input
            name={adminFormFields.promotion.isActive}
            type="checkbox"
            defaultChecked
            className="h-4 w-4 rounded border-boutique-line text-boutique-sage-deep"
          />
          Активна
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-xs font-medium text-boutique-ink">
          Начало
          <input
            name={adminFormFields.promotion.startsAt}
            type="datetime-local"
            required
            className={adminFieldClass}
          />
        </label>
        <label className="text-xs font-medium text-boutique-ink">
          Край
          <input
            name={adminFormFields.promotion.endsAt}
            type="datetime-local"
            required
            className={adminFieldClass}
          />
        </label>
      </div>

      {selectedProduct ? (
        <PromotionPricePreview
          basePrice={Number(selectedProduct.price)}
          discountType={discountType}
          discountValue={parsedDiscountValue}
        />
      ) : null}

      <div className="flex justify-end border-t border-boutique-line/60 pt-3">
        <button className="rounded-full bg-boutique-ink px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-boutique-accent">
          Добави промоция
        </button>
      </div>
    </form>
  );
}
