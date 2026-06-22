"use client";

import { useId, useMemo, useState } from "react";

import type { ProductColorField } from "@/lib/product-colors";
import type { ColorQuantitiesByOptionId } from "@/lib/product-color-quantities";
import {
  sumColorQuantities,
  validateColorQuantities,
} from "@/lib/product-color-quantities";

type ProductColorQuantitySelectorProps = {
  field: ProductColorField;
  quantities: ColorQuantitiesByOptionId;
  onChange: (quantities: ColorQuantitiesByOptionId) => void;
};

function clampQuantity(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(99, Math.trunc(value)));
}

export function ProductColorQuantitySelector({
  field,
  quantities,
  onChange,
}: ProductColorQuantitySelectorProps) {
  const optionsId = useId();
  const [expanded, setExpanded] = useState(false);
  const requiredTotal = field.requiredTotalQuantity ?? 0;
  const selectedTotal = sumColorQuantities(quantities);
  const validationMessage = validateColorQuantities(field, quantities);
  const canIncrease = selectedTotal < requiredTotal;
  const hasMoreOptions = field.options.length > 6;
  const visibleOptions = useMemo(
    () => field.options.filter((option, index) =>
      expanded || index < 6 || (quantities[option.id] ?? 0) > 0,
    ),
    [expanded, field.options, quantities],
  );

  const updateQuantity = (optionId: string, nextQuantity: number) => {
    onChange({
      ...quantities,
      [optionId]: clampQuantity(nextQuantity),
    });
  };

  return (
    <fieldset className="rounded-2xl border border-boutique-line bg-white/60 p-4">
      <legend className="px-1 text-sm font-semibold text-boutique-ink">
        {field.label}
      </legend>
      <p
        className="mt-2 text-sm text-boutique-muted"
        aria-live="polite"
        aria-atomic="true"
      >
        Избрани {selectedTotal} от {requiredTotal}
      </p>

      <div id={optionsId} className="mt-4 grid gap-3 md:grid-cols-2">
        {visibleOptions.map((option) => {
          const quantity = quantities[option.id] ?? 0;
          const decreaseDisabled = quantity <= 0;
          const increaseDisabled = !canIncrease;

          return (
            <div
              key={option.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-boutique-line bg-white px-3 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  aria-hidden="true"
                  className="h-10 w-10 shrink-0 rounded-full border border-boutique-line shadow-inner"
                  style={{ backgroundColor: option.hex ?? "#eee8df" }}
                />
                <span className="text-sm font-medium text-boutique-ink">
                  {option.name}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={decreaseDisabled}
                  aria-label={`Намали количеството за ${option.name}`}
                  onClick={() => updateQuantity(option.id, quantity - 1)}
                  className="grid h-10 w-10 place-items-center rounded-full border border-boutique-line text-lg font-semibold text-boutique-ink transition enabled:hover:border-boutique-sage-deep enabled:hover:text-boutique-sage-deep disabled:cursor-not-allowed disabled:opacity-40"
                >
                  −
                </button>
                <span
                  className="min-w-8 text-center text-sm font-semibold tabular-nums text-boutique-ink"
                  aria-label={`Количество за ${option.name}`}
                >
                  {quantity}
                </span>
                <button
                  type="button"
                  disabled={increaseDisabled}
                  aria-label={`Увеличи количеството за ${option.name}`}
                  onClick={() => updateQuantity(option.id, quantity + 1)}
                  className="grid h-10 w-10 place-items-center rounded-full border border-boutique-line text-lg font-semibold text-boutique-ink transition enabled:hover:border-boutique-sage-deep enabled:hover:text-boutique-sage-deep disabled:cursor-not-allowed disabled:opacity-40"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {hasMoreOptions ? (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={optionsId}
          onClick={() => setExpanded((current) => !current)}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-boutique-line bg-white px-4 py-3 text-sm font-semibold text-boutique-ink transition hover:border-boutique-sage-deep hover:text-boutique-sage-deep"
        >
          {expanded ? "Покажи по-малко" : `Виж всички цветове (${field.options.length})`}
          <span
            aria-hidden="true"
            className={`transition motion-reduce:transition-none ${expanded ? "rotate-180" : ""}`}
          >
            ⌄
          </span>
        </button>
      ) : null}

      {validationMessage && selectedTotal > 0 ? (
        <p className="mt-4 text-sm font-medium text-red-700" role="alert">
          {validationMessage}
        </p>
      ) : null}
    </fieldset>
  );
}
