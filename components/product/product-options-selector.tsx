"use client";

import { useEffect, useMemo, useState } from "react";

import {
  calculateEstimatedUnitPrice,
  calculateOptionFinalPrice,
  formatPriceDelta,
} from "@/lib/product-option-pricing";
import type { ProductOptionGroup, ProductOptionSelection } from "@/lib/product-options";
import {
  buildDefaultOptionSelections,
  getBooleanOptionValues,
  getVisibleOptionGroups,
  isChoiceOptionGroup,
  isTextOptionGroup,
} from "@/lib/product-options";

type ProductOptionsSelectorProps = {
  basePrice: number;
  groups: ProductOptionGroup[];
  value: ProductOptionSelection[];
  onChange: (selections: ProductOptionSelection[]) => void;
  onEstimatedPriceChange?: (price: number) => void;
};

function formatCurrency(value: number) {
  return `${value.toFixed(2).replace(".", ",")} €`;
}

export function ProductOptionsSelector({
  basePrice,
  groups,
  value,
  onChange,
  onEstimatedPriceChange,
}: ProductOptionsSelectorProps) {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (initialized || value.length > 0) {
      setInitialized(true);
      return;
    }
    const defaults = buildDefaultOptionSelections(groups);
    if (defaults.length > 0) {
      onChange(defaults);
    }
    setInitialized(true);
  }, [groups, initialized, onChange, value.length]);

  const visibleGroups = useMemo(
    () => getVisibleOptionGroups(groups, value),
    [groups, value],
  );

  const estimatedPrice = useMemo(
    () => calculateEstimatedUnitPrice(basePrice, groups, value),
    [basePrice, groups, value],
  );

  useEffect(() => {
    onEstimatedPriceChange?.(estimatedPrice);
  }, [estimatedPrice, onEstimatedPriceChange]);

  useEffect(() => {
    const visibleIds = new Set(visibleGroups.map((group) => group.id));
    const pruned = value.filter((selection) => visibleIds.has(selection.groupId));
    if (pruned.length !== value.length) {
      onChange(pruned);
    }
  }, [onChange, value, visibleGroups]);

  const selectionByGroup = useMemo(() => {
    const map = new Map<string, ProductOptionSelection>();
    value.forEach((selection) => map.set(selection.groupId, selection));
    return map;
  }, [value]);

  const updateSelection = (groupId: string, next: ProductOptionSelection) => {
    const others = value.filter((selection) => selection.groupId !== groupId);
    const hasContent = next.valueIds.length > 0 || Boolean(next.textValue?.trim());
    onChange(hasContent ? [...others, next] : others);
  };

  if (!groups.length) {
    return null;
  }

  return (
    <div className="mt-7 space-y-6">
      {visibleGroups.map((group) => {
        const selection = selectionByGroup.get(group.id) ?? {
          groupId: group.id,
          valueIds: [],
        };

        if (isChoiceOptionGroup(group)) {
          const booleanValues = getBooleanOptionValues(group);
          if (booleanValues) {
            const selected = selection.valueIds.includes(booleanValues.yes.id);
            const deltaLabel = formatPriceDelta(booleanValues.yes.priceDelta);

            return (
              <fieldset key={group.id}>
                <legend className="text-sm font-semibold text-boutique-ink">
                  {group.name}
                  {group.isRequired ? " *" : ""}
                </legend>
                <label
                  className={`mt-3 flex items-center gap-4 rounded-2xl border border-boutique-line bg-boutique-bg px-5 py-4 ${
                    booleanValues.yes.isSoldOut
                      ? "cursor-not-allowed opacity-60"
                      : "cursor-pointer"
                  }`}
                >
                  <input
                    className="sr-only"
                    type="checkbox"
                    checked={selected}
                    disabled={booleanValues.yes.isSoldOut}
                    onChange={(event) =>
                      updateSelection(group.id, {
                        groupId: group.id,
                        valueIds: [
                          event.target.checked
                            ? booleanValues.yes.id
                            : booleanValues.no.id,
                        ],
                      })
                    }
                  />
                  <span
                    className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                      selected ? "bg-boutique-sage" : "bg-boutique-line"
                    }`}
                  >
                    <span
                      className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${
                        selected ? "translate-x-5" : ""
                      }`}
                    />
                  </span>
                  <span className="min-w-0 flex-1 font-medium leading-relaxed text-boutique-ink">
                    {booleanValues.yes.label}
                  </span>
                  {deltaLabel ? (
                    <span className="shrink-0 text-sm font-semibold text-boutique-accent">
                      {deltaLabel}
                    </span>
                  ) : null}
                </label>
              </fieldset>
            );
          }

          return (
            <fieldset key={group.id}>
              <legend className="text-sm font-semibold text-boutique-ink">
                {group.name}
                {group.isRequired ? " *" : ""}
              </legend>
              <div
                className={`mt-3 grid gap-3 ${
                  group.inputType === "single" ? "sm:grid-cols-2" : "sm:grid-cols-2"
                }`}
              >
                {group.values
                  .filter((option) => option.isActive)
                  .map((option) => {
                    const selected = selection.valueIds.includes(option.id);
                    const deltaLabel = formatPriceDelta(option.priceDelta);
                    const finalPrice = calculateOptionFinalPrice(
                      basePrice,
                      option.priceDelta,
                    );
                    return (
                      <label
                        key={option.id}
                        className={`relative flex min-h-24 cursor-pointer items-center gap-4 rounded-2xl border px-5 py-4 text-sm transition ${
                          option.isSoldOut
                            ? "cursor-not-allowed border-boutique-line/60 bg-boutique-bg text-boutique-muted opacity-60"
                            : selected
                              ? "border-boutique-sage-deep bg-boutique-sage/10 shadow-boutique-sm"
                              : "border-boutique-line bg-white hover:border-boutique-sage-deep/50"
                        }`}
                      >
                        <input
                          className="h-5 w-5 shrink-0 accent-boutique-sage-deep"
                          type={group.inputType === "single" ? "radio" : "checkbox"}
                          name={`option-${group.id}`}
                          checked={selected}
                          disabled={option.isSoldOut}
                          onChange={(event) => {
                            const current = selection.valueIds;
                            let nextIds: string[];
                            if (group.inputType === "single") {
                              nextIds = event.target.checked ? [option.id] : [];
                            } else {
                              nextIds = event.target.checked
                                ? [...current, option.id].slice(0, group.maxSelect)
                                : current.filter((id) => id !== option.id);
                            }
                            updateSelection(group.id, {
                              groupId: group.id,
                              valueIds: nextIds,
                            });
                          }}
                        />
                        <span className="flex min-w-0 flex-1 items-center justify-between gap-4">
                          <span className="font-medium leading-relaxed text-boutique-ink">
                            {option.label}
                          </span>
                          {option.isSoldOut ? (
                            <span className="ml-2 text-xs text-boutique-muted">(изчерпано)</span>
                          ) : null}
                          <span className="shrink-0 text-base font-semibold text-boutique-ink">
                            {group.inputType === "single"
                              ? formatCurrency(finalPrice)
                              : deltaLabel ?? "Без доплащане"}
                          </span>
                        </span>
                      </label>
                    );
                  })}
              </div>
            </fieldset>
          );
        }

        if (isTextOptionGroup(group)) {
          const textValue = selection.textValue ?? "";
          const deltaLabel = formatPriceDelta(group.textPriceDelta);
          const common = {
            id: `option-text-${group.id}`,
            value: textValue,
            required: group.isRequired,
            maxLength: group.maxLength ?? 1000,
            placeholder: group.placeholder ?? undefined,
            onChange: (
              event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
            ) =>
              updateSelection(group.id, {
                groupId: group.id,
                valueIds: [],
                textValue: event.target.value.slice(0, group.maxLength ?? 1000),
              }),
            className:
              "mt-2 w-full rounded-xl border border-boutique-line bg-white px-4 py-3 text-sm text-boutique-ink outline-none focus:border-boutique-rose-deep",
          };

          return (
            <label key={group.id} className="block text-sm font-medium text-boutique-ink">
              <span>
                {group.name}
                {group.isRequired ? " *" : ""}
                {deltaLabel ? (
                  <span className="ml-2 text-xs font-semibold text-boutique-accent">
                    {deltaLabel}
                  </span>
                ) : null}
              </span>
              {group.inputType === "textarea" ? (
                <textarea {...common} rows={3} />
              ) : (
                <input {...common} type={group.inputType === "date" ? "date" : "text"} />
              )}
            </label>
          );
        }

        return null;
      })}

      <p className="text-sm text-boutique-muted">
        Ориентировъчна цена:{" "}
        <span className="font-semibold text-boutique-ink">
          {estimatedPrice.toFixed(2).replace(".", ",")} €
        </span>
        <span className="ml-2 text-xs">(окончателната се потвърждава при поръчка)</span>
      </p>
    </div>
  );
}
