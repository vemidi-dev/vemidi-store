"use client";

import { useEffect, useMemo, useState } from "react";

import {
  calculateEstimatedUnitPrice,
  formatOptionChoicePrice,
  formatPriceDelta,
} from "@/lib/product-option-pricing";
import {
  optionValueSupportsMaterialCard,
} from "@/lib/product-option-layout";
import type { ProductOptionGroup, ProductOptionSelection, ProductOptionValue } from "@/lib/product-options";
import {
  buildDefaultOptionSelections,
  getBooleanOptionValues,
  getVisibleOptionGroups,
  isChoiceOptionGroup,
  isTextOptionGroup,
} from "@/lib/product-options";
import {
  resolveOptionGroupVariantDisplaySize,
  variantDisplaySizeGridClass,
} from "@/lib/product-variants";

type ProductOptionsSelectorProps = {
  basePrice: number;
  variantDisplayBasePrice?: number;
  groups: ProductOptionGroup[];
  value: ProductOptionSelection[];
  onChange: (selections: ProductOptionSelection[]) => void;
  onEstimatedPriceChange?: (price: number) => void;
  useMaterialCards?: boolean;
  priceSummaryLabel?: string;
  priceSummaryNote?: string | null;
};

function MaterialOptionCard({
  option,
  group,
  selected,
  priceLabel,
  selection,
  updateSelection,
}: {
  option: ProductOptionValue;
  group: ProductOptionGroup;
  selected: boolean;
  priceLabel: string | null;
  selection: ProductOptionSelection;
  updateSelection: (groupId: string, next: ProductOptionSelection) => void;
}) {
  const material = option.material;
  const title = material?.name?.trim() || option.label;
  const description = material?.description?.trim() || null;

  return (
    <label
      className={`relative flex cursor-pointer items-center gap-2 overflow-hidden rounded-lg border bg-white p-2 text-left transition duration-200 ease-out motion-reduce:transition-none ${
        option.isSoldOut
          ? "cursor-not-allowed border-boutique-line/60 opacity-60"
          : selected
            ? "border-boutique-sage-deep shadow-boutique-sm ring-2 ring-boutique-sage/25"
            : "border-boutique-line hover:border-boutique-sage-deep/55"
      }`}
    >
      <input
        className="sr-only"
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
      <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-boutique-line/70 bg-boutique-bg sm:h-14 sm:w-14 sm:rounded-lg">
        {material?.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={material.imageUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full items-center justify-center px-1 text-center text-[9px] font-medium leading-tight text-boutique-muted">
            {title.slice(0, 2)}
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1 pr-5">
        <span className="block text-xs font-semibold leading-4 text-boutique-ink sm:text-sm sm:leading-5">
          {title}
        </span>
        {description ? (
          <span className="mt-0.5 line-clamp-2 block text-[11px] leading-4 text-boutique-muted">
            {description}
          </span>
        ) : null}
        {priceLabel ? (
          <span className="mt-1 block text-xs font-semibold text-boutique-ink sm:text-sm">
            {priceLabel}
          </span>
        ) : null}
        {option.isSoldOut ? (
          <span className="mt-0.5 block text-[0.6rem] font-semibold uppercase tracking-wide text-boutique-muted">
            изчерпано
          </span>
        ) : null}
      </span>
      {selected ? (
        <span
          className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-boutique-sage-deep text-[10px] font-bold text-white shadow-sm"
          aria-hidden
        >
          ✓
        </span>
      ) : null}
    </label>
  );
}

function CompactOptionChoice({
  option,
  group,
  selected,
  priceLabel,
  selection,
  updateSelection,
}: {
  option: ProductOptionValue;
  group: ProductOptionGroup;
  selected: boolean;
  priceLabel: string | null;
  selection: ProductOptionSelection;
  updateSelection: (groupId: string, next: ProductOptionSelection) => void;
}) {
  return (
    <label
      key={option.id}
      className={`relative grid min-h-[3.25rem] cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition duration-200 ease-out motion-reduce:transition-none ${
        priceLabel
          ? "grid-cols-[auto_minmax(0,1fr)_auto]"
          : "grid-cols-[auto_minmax(0,1fr)]"
      } ${
        option.isSoldOut
          ? "cursor-not-allowed border-boutique-line/60 bg-boutique-bg text-boutique-muted opacity-60"
          : selected
            ? "border-boutique-sage-deep bg-boutique-sage/10 shadow-boutique-sm"
            : "border-boutique-line bg-white hover:-translate-y-1 hover:border-boutique-sage-deep/55 hover:shadow-[0_12px_24px_-10px_rgb(44_40_37_/0.14)] motion-reduce:hover:translate-y-0"
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
          <span className="shrink-0 whitespace-nowrap text-sm font-semibold text-boutique-ink">
            {priceLabel}
          </span>
        ) : null}
      </span>
    </label>
  );
}

export function ProductOptionsSelector({
  basePrice,
  variantDisplayBasePrice = basePrice,
  groups,
  value,
  onChange,
  onEstimatedPriceChange,
  useMaterialCards = false,
  priceSummaryLabel = "Ориентировъчна цена",
  priceSummaryNote = "(окончателната се потвърждава при поръчка)",
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
    <div className="mt-5 space-y-5">
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
                  className={`mt-2 flex items-center gap-3 rounded-xl border border-boutique-line bg-boutique-bg px-3 py-2.5 transition duration-200 ease-out hover:border-boutique-sage-deep/35 hover:bg-white motion-reduce:transition-none ${
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

          const activeValues = group.values.filter((option) => option.isActive);
          const materialValues = useMaterialCards
            ? activeValues.filter((option) => optionValueSupportsMaterialCard(option))
            : [];
          const compactValues = useMaterialCards
            ? activeValues.filter((option) => !optionValueSupportsMaterialCard(option))
            : activeValues;

          return (
            <fieldset key={group.id}>
              <legend className="text-sm font-semibold text-boutique-ink">
                {group.name}
                {group.isRequired ? " *" : ""}
              </legend>
              {materialValues.length ? (
                <div
                  className={`mt-2 ${variantDisplaySizeGridClass(
                    resolveOptionGroupVariantDisplaySize(
                      materialValues.map((option) => option.material?.displaySize),
                    ),
                  )}`}
                >
                  {materialValues.map((option) => {
                    const selected = selection.valueIds.includes(option.id);
                    const priceLabel = formatOptionChoicePrice(
                      variantDisplayBasePrice,
                      option.priceDelta,
                      false,
                    );
                    return (
                      <MaterialOptionCard
                        key={option.id}
                        option={option}
                        group={group}
                        selected={selected}
                        priceLabel={priceLabel}
                        selection={selection}
                        updateSelection={updateSelection}
                      />
                    );
                  })}
                </div>
              ) : null}
              {compactValues.length ? (
                <div
                  className={`grid gap-2 sm:grid-cols-2 ${
                    materialValues.length ? "mt-3" : "mt-2"
                  }`}
                >
                  {compactValues.map((option) => {
                    const selected = selection.valueIds.includes(option.id);
                    const priceLabel = formatOptionChoicePrice(
                      variantDisplayBasePrice,
                      option.priceDelta,
                      false,
                    );
                    return (
                      <CompactOptionChoice
                        key={option.id}
                        option={option}
                        group={group}
                        selected={selected}
                        priceLabel={priceLabel}
                        selection={selection}
                        updateSelection={updateSelection}
                      />
                    );
                  })}
                </div>
              ) : null}
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
              "mt-2 w-full rounded-xl border border-boutique-line bg-white px-3 py-2.5 text-sm text-boutique-ink outline-none transition duration-200 ease-out focus:border-boutique-rose-deep focus:ring-2 focus:ring-boutique-rose/15 motion-reduce:transition-none",
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

      <p className="rounded-xl bg-boutique-bg px-3 py-2 text-sm leading-5 text-boutique-muted">
        {priceSummaryLabel}:{" "}
        <span className="font-semibold text-boutique-ink">
          {estimatedPrice.toFixed(2).replace(".", ",")} €
        </span>
        {priceSummaryNote ? (
          <span className="ml-2 text-xs">{priceSummaryNote}</span>
        ) : null}
      </p>
    </div>
  );
}
