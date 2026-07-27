"use client";

import { ProductColorQuantitySelector } from "@/components/product/product-color-quantity-selector";
import type { ProductColorField } from "@/lib/product-colors";
import {
  isQuantityColorField,
  type ColorQuantitiesByOptionId,
} from "@/lib/product-color-quantities";
import { buildSelectedColorLabel } from "@/lib/product-selected-color-label";

export const PRODUCT_LEFT_COLORS_SLOT_ID = "product-left-colors-slot";

type ProductDetailColorFieldsProps = {
  colorFields: ProductColorField[];
  selectedByGroup: Record<string, string[]>;
  onSelectedByGroupChange: (
    updater: (current: Record<string, string[]>) => Record<string, string[]>,
  ) => void;
  quantitiesByField: Record<string, ColorQuantitiesByOptionId>;
  onQuantitiesByFieldChange: (
    updater: (
      current: Record<string, ColorQuantitiesByOptionId>,
    ) => Record<string, ColorQuantitiesByOptionId>,
  ) => void;
  expandedColorFields: Set<string>;
  onExpandedColorFieldsChange: (
    updater: (current: Set<string>) => Set<string>,
  ) => void;
  embedded?: boolean;
  variant?: "default" | "sidebar";
  onColorSelectionChange?: () => void;
  onQuantityReset?: () => void;
};

export function ProductDetailColorFields({
  colorFields,
  selectedByGroup,
  onSelectedByGroupChange,
  quantitiesByField,
  onQuantitiesByFieldChange,
  expandedColorFields,
  onExpandedColorFieldsChange,
  embedded = true,
  variant = "default",
  onColorSelectionChange,
  onQuantityReset,
}: ProductDetailColorFieldsProps) {
  if (!colorFields.length) {
    return null;
  }

  const isSidebar = variant === "sidebar";
  const selectedColorLabel = isSidebar
    ? buildSelectedColorLabel(colorFields, selectedByGroup, quantitiesByField)
    : null;

  return (
    <div
      className={
        isSidebar
          ? "mt-4 w-full min-w-0 space-y-3"
          : `mt-5 grid gap-4 ${!embedded && colorFields.length > 1 ? "lg:grid-cols-2" : ""}`
      }
    >
      {colorFields.map((field) =>
        isQuantityColorField(field) ? (
          <ProductColorQuantitySelector
            key={field.id}
            field={field}
            quantities={quantitiesByField[field.id] ?? {}}
            onChange={(quantities) => {
              onQuantitiesByFieldChange((state) => ({ ...state, [field.id]: quantities }));
              onColorSelectionChange?.();
            }}
          />
        ) : (
          <fieldset
            key={field.id}
            className={
              isSidebar
                ? "rounded-xl border border-boutique-line bg-white/80 p-3"
                : "rounded-2xl border border-boutique-line bg-white/60 p-3 transition-shadow duration-300 ease-out hover:shadow-boutique-sm motion-reduce:transition-none"
            }
          >
            <legend className="px-1 text-sm font-semibold text-boutique-ink">
              {field.label}
            </legend>
            <div
              id={`color-options-${field.id}`}
              className={`mt-3 grid gap-2 ${
                isSidebar
                  ? "grid-cols-5 sm:grid-cols-6"
                  : `grid-cols-4 sm:grid-cols-6 ${embedded ? "lg:grid-cols-4 xl:grid-cols-6" : "lg:grid-cols-6"}`
              }`}
            >
              {field.options
                .filter(
                  (option, index) =>
                    expandedColorFields.has(field.id) ||
                    index < (isSidebar ? 10 : 12) ||
                    (selectedByGroup[field.id] ?? []).includes(option.id),
                )
                .map((option) => {
                  const selected = (selectedByGroup[field.id] ?? []).includes(option.id);
                  return (
                    <label
                      key={option.id}
                      className="group cursor-pointer rounded-lg p-1 text-center text-[11px] text-boutique-muted transition duration-200 ease-out hover:bg-boutique-bg motion-reduce:transition-none"
                    >
                      <input
                        className="peer sr-only"
                        type={field.maxSelect <= 1 ? "radio" : "checkbox"}
                        name={`color-${field.id}`}
                        checked={selected}
                        onChange={(event) => {
                          const current = selectedByGroup[field.id] ?? [];
                          const next =
                            field.maxSelect <= 1
                              ? event.target.checked
                                ? [option.id]
                                : []
                              : event.target.checked
                                ? [...current, option.id].slice(0, field.maxSelect)
                                : current.filter((id) => id !== option.id);
                          onSelectedByGroupChange((state) => ({
                            ...state,
                            [field.id]: next,
                          }));
                          onQuantityReset?.();
                          onColorSelectionChange?.();
                        }}
                      />
                      <span
                        className={`relative mx-auto grid h-9 w-9 place-items-center rounded-full border-2 border-white shadow-sm ring-1 transition duration-200 ease-out group-hover:scale-[1.04] peer-focus-visible:ring-2 peer-focus-visible:ring-boutique-sage-deep motion-reduce:transition-none motion-reduce:group-hover:scale-100 sm:h-10 sm:w-10 ${
                          selected
                            ? "ring-2 ring-boutique-sage-deep"
                            : "ring-boutique-line"
                        }`}
                        style={{ backgroundColor: option.hex ?? "#eee8df" }}
                      >
                        {selected ? (
                          <span
                            aria-hidden="true"
                            className="grid h-4 w-4 place-items-center rounded-full bg-white/90 text-[0.6rem] font-bold text-boutique-sage-deep shadow-sm"
                          >
                            ✓
                          </span>
                        ) : null}
                      </span>
                      <span
                        className={`mt-1.5 block leading-4 ${
                          selected ? "font-semibold text-boutique-ink" : ""
                        }`}
                      >
                        {option.name}
                      </span>
                    </label>
                  );
                })}
            </div>
            {field.options.length > (isSidebar ? 10 : 12) ? (
              <button
                type="button"
                aria-expanded={expandedColorFields.has(field.id)}
                aria-controls={`color-options-${field.id}`}
                onClick={() => {
                  onExpandedColorFieldsChange((current) => {
                    const next = new Set(current);
                    if (next.has(field.id)) next.delete(field.id);
                    else next.add(field.id);
                    return next;
                  });
                }}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-boutique-line bg-white px-3 py-2 text-xs font-semibold text-boutique-ink transition hover:border-boutique-sage-deep hover:text-boutique-sage-deep"
              >
                {expandedColorFields.has(field.id)
                  ? "Покажи по-малко"
                  : `Вижте всички цветове (${field.options.length})`}
                <span
                  aria-hidden="true"
                  className={`transition motion-reduce:transition-none ${
                    expandedColorFields.has(field.id) ? "rotate-180" : ""
                  }`}
                >
                  ⌄
                </span>
              </button>
            ) : null}
          </fieldset>
        ),
      )}
      {isSidebar ? (
        <p className="text-xs text-boutique-muted" aria-live="polite">
          Избран цвят:{" "}
          <span className="font-semibold text-boutique-ink">
            {selectedColorLabel ?? "—"}
          </span>
        </p>
      ) : null}
    </div>
  );
}
