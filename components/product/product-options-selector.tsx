"use client";

import { useEffect, useMemo, useState } from "react";

import {
  calculateEstimatedUnitPrice,
  formatPriceDelta,
} from "@/lib/product-option-pricing";
import type { ProductOptionGroup, ProductOptionSelection } from "@/lib/product-options";
import {
  buildDefaultOptionSelections,
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
          return (
            <fieldset key={group.id}>
              <legend className="text-sm font-semibold text-boutique-ink">
                {group.name}
                {group.isRequired ? " *" : ""}
              </legend>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {group.values
                  .filter((option) => option.isActive)
                  .map((option) => {
                    const selected = selection.valueIds.includes(option.id);
                    const deltaLabel = formatPriceDelta(option.priceDelta);
                    return (
                      <label
                        key={option.id}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm ${
                          option.isSoldOut
                            ? "cursor-not-allowed border-boutique-line/60 bg-boutique-bg text-boutique-muted opacity-60"
                            : selected
                              ? "border-boutique-sage-deep bg-boutique-sage/10"
                              : "border-boutique-line bg-white"
                        }`}
                      >
                        <input
                          className="shrink-0"
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
                        <span className="flex-1">
                          <span className="font-medium text-boutique-ink">{option.label}</span>
                          {option.isSoldOut ? (
                            <span className="ml-2 text-xs text-boutique-muted">(изчерпано)</span>
                          ) : null}
                          {deltaLabel ? (
                            <span className="ml-2 text-xs font-semibold text-boutique-accent">
                              {deltaLabel}
                            </span>
                          ) : null}
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
