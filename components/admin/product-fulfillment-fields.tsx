"use client";

import { useMemo, useState } from "react";

import { adminFieldClass, adminHelperClass } from "@/components/admin/styles";
import { adminFormFields } from "@/lib/admin/form-fields";
import {
  type ProductFulfillmentType,
  validateFulfillmentInput,
} from "@/lib/product-fulfillment";

type ProductFulfillmentFieldsProps = {
  initialFulfillmentType?: ProductFulfillmentType;
  initialStockQuantity?: number | null;
  fieldClassName?: string;
  helperClassName?: string;
};

const FULFILLMENT_OPTIONS: Array<{
  value: ProductFulfillmentType;
  label: string;
  helper: string;
}> = [
  {
    value: "made_to_order",
    label: "Изработва се по поръчка",
    helper: "Без количествен лимит. Подходящо за всички текущи продукти.",
  },
  {
    value: "stocked",
    label: "Складова наличност",
    helper: "Поръчката намалява наличността атомарно при checkout.",
  },
  {
    value: "unavailable",
    label: "Временно недостъпен",
    helper: "Продуктът остава видим, но не може да се поръча.",
  },
];

export function ProductFulfillmentFields({
  initialFulfillmentType = "made_to_order",
  initialStockQuantity = null,
  fieldClassName = adminFieldClass,
  helperClassName = adminHelperClass,
}: ProductFulfillmentFieldsProps) {
  const [fulfillmentType, setFulfillmentType] = useState<ProductFulfillmentType>(
    initialFulfillmentType,
  );
  const [stockQuantity, setStockQuantity] = useState(
    initialStockQuantity === null || initialStockQuantity === undefined
      ? ""
      : String(initialStockQuantity),
  );

  const clientError = useMemo(() => {
    const parsedStock =
      stockQuantity.trim() === "" ? null : Number.parseInt(stockQuantity, 10);
    if (
      stockQuantity.trim() !== "" &&
      (parsedStock === null || !Number.isInteger(parsedStock) || parsedStock < 0)
    ) {
      return "Складовата наличност трябва да е цяло число >= 0.";
    }
    return validateFulfillmentInput(fulfillmentType, parsedStock);
  }, [fulfillmentType, stockQuantity]);

  return (
    <fieldset className="space-y-4 rounded-lg border border-boutique-line/70 bg-boutique-bg/40 p-4">
      <legend className="px-1 text-sm font-medium text-boutique-ink">
        Наличност и изпълнение
      </legend>

      <div className="grid gap-3">
        {FULFILLMENT_OPTIONS.map((option) => (
          <label
            key={option.value}
            className="flex cursor-pointer items-start gap-3 rounded-lg border border-boutique-line/70 bg-white px-3 py-3"
          >
            <input
              type="radio"
              name={adminFormFields.product.fulfillmentType}
              value={option.value}
              checked={fulfillmentType === option.value}
              onChange={() => setFulfillmentType(option.value)}
              className="mt-1 h-4 w-4 border-boutique-line text-boutique-accent"
            />
            <span>
              <span className="block text-sm font-semibold text-boutique-ink">
                {option.label}
              </span>
              <span className={`${helperClassName} mt-1 block`}>{option.helper}</span>
            </span>
          </label>
        ))}
      </div>

      {fulfillmentType === "stocked" ? (
        <label className="block text-sm font-medium text-boutique-ink">
          Складова наличност (бр.)
          <input
            name={adminFormFields.product.stockQuantity}
            type="number"
            min={0}
            step={1}
            required
            value={stockQuantity}
            onChange={(event) => setStockQuantity(event.target.value)}
            className={`${fieldClassName} mt-2`}
            placeholder="0"
          />
          <p className={helperClassName}>
            Въведете цяло число. При 0 броя продуктът не може да се поръча.
          </p>
        </label>
      ) : (
        <input type="hidden" name={adminFormFields.product.stockQuantity} value="" />
      )}

      {clientError ? (
        <p className="text-sm text-red-700" role="alert">
          {clientError}
        </p>
      ) : null}
    </fieldset>
  );
}
