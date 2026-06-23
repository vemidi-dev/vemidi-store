"use client";

import { useEffect, useMemo, useState } from "react";

import {
  calculateEstimatedUnitPrice,
  formatOptionChoicePrice,
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
  variantDisplayBasePrice?: number;
  groups: ProductOptionGroup[];
  value: ProductOptionSelection[];
  onChange: (selections: ProductOptionSelection[]) => void;
  onEstimatedPriceChange?: (price: number) => void;
};

export function ProductOptionsSelector({
  basePrice,
  variantDisplayBasePrice = basePrice,
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

  const primaryChoiceGroupId = useMemo(
    () =>
      groups.find(
        (group) =>
          group.isActive &&
          isChoiceOptionGroup(group) &&
          !getBooleanOptionValues(group),
      )?.id ?? null,
    [groups],
  );

  const updateSelection = (groupId: string, next: ProductOptionSelection) => {
    const others = value.filter((selection) => selection.groupId !== groupId);
    const hasContent = next.valueIds.length > 0 || Boolean(next.textValue?.trim());
    onChange(hasContent ? [...others, next] : others);
  };

  if (!groups.length) {
    return null;
  }

  return (
    <div className="mt-6 space-y-6">
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
                  className={`mt-2.5 flex items-center gap-3 rounded-xl border border-boutique-line bg-boutique-bg px-4 py-3 transition duration-200 ease-out hover:border-boutique-sage-deep/35 hover:bg-white motion-reduce:transition-none ${
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
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ease-out motion-reduce:transition-none ${
                      selected ? "bg-boutique-sage" : "bg-boutique-line"
                    }`}
                  >
                    <span
                      className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out motion-reduce:transition-none ${
                        selected ? "translate-x-5" : ""
                      }`}
                    />
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-semibold leading-5 text-boutique-ink">
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
              <div className="mt-2.5 grid gap-2.5">
                {group.values
                  .filter((option) => option.isActive)
                  .map((option) => {
                    const selected = selection.valueIds.includes(option.id);
                    const showsFinalPrice = group.id === primaryChoiceGroupId;
                    const priceLabel = formatOptionChoicePrice(
                      variantDisplayBasePrice,
                      option.priceDelta,
                      group.inputType === "single" && showsFinalPrice,
                    );
                    return (
                      <label
                        key={option.id}
                        className={`relative grid min-h-[4.5rem] cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition duration-200 ease-out motion-reduce:transition-none ${
                          priceLabel
                            ? "grid-cols-[auto_minmax(0,1fr)_auto]"
                            : "grid-cols-[auto_minmax(0,1fr)]"
                        } ${
                          option.isSoldOut
                            ? "cursor-not-allowed border-boutique-line/60 bg-boutique-bg text-boutique-muted opacity-60"
                            : selected
                              ? "border-boutique-sage-deep bg-boutique-sage/10 shadow-boutique-sm"
                              : "border-boutique-line bg-white hover:-translate-y-0.5 hover:border-boutique-sage-deep/50 hover:shadow-boutique-sm motion-reduce:hover:translate-y-0"
                        }`}
                      >
                        <input
                          className="h-4 w-4 shrink-0 accent-boutique-sage-deep"
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
                        <span className="contents">
                          <span className="min-w-0 font-semibold leading-5 text-boutique-ink">
                            {option.label}
                          </span>
                          {option.isSoldOut ? (
                            <span className="absolute right-4 top-2 text-[0.65rem] font-semibold uppercase tracking-wide text-boutique-muted">
                              (изчерпано)
                            </span>
                          ) : null}
                        {priceLabel ? (
                          <span className="shrink-0 whitespace-nowrap text-base font-semibold text-boutique-ink">
                            {priceLabel}
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
              "mt-2 w-full rounded-xl border border-boutique-line bg-white px-4 py-3 text-sm text-boutique-ink outline-none transition duration-200 ease-out focus:border-boutique-rose-deep focus:ring-2 focus:ring-boutique-rose/15 motion-reduce:transition-none",
          };

          return (
            <label key={group.id} className="block text-sm font-semibold text-boutique-ink">
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

      <p className="rounded-xl bg-boutique-bg px-4 py-2.5 text-sm leading-5 text-boutique-muted">
        Ориентировъчна цена:{" "}
        <span className="font-semibold text-boutique-ink">
          {estimatedPrice.toFixed(2).replace(".", ",")} €
        </span>
        <span className="ml-2 text-xs">(окончателната се потвърждава при поръчка)</span>
      </p>
    </div>
  );
}
