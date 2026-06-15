"use client";

import { useEffect, useRef, useState } from "react";

import { useCart } from "@/components/cart/cart-provider";
import { ProductOptionsSelector } from "@/components/product/product-options-selector";
import type { CampaignAttribution } from "@/lib/campaign-attribution";
import type { Product } from "@/lib/catalog";
import type { ProductOptionSelection } from "@/lib/product-options";
import { validateProductOptionSelections } from "@/lib/product-option-validation";
import type { SelectedProductColor } from "@/lib/product-colors";
import { formatPriceDelta } from "@/lib/product-option-pricing";
import { formatEur } from "@/lib/format-eur";
import type { ProductPersonalizationField } from "@/lib/product-personalization";
import {
  buildPersonalizationFieldValues,
  buildPersonalizationSummary,
  calculatePersonalizationDelta,
  enableOptionalPersonalizationField,
  formatPersonalizationToggleLabel,
  shouldShowPersonalizationInput,
  usesPersonalizationToggle,
} from "@/lib/product-personalization";

type ProductDetailAddToCartProps = {
  product: Product;
  attribution?: CampaignAttribution;
  initialOptionSelections?: ProductOptionSelection[];
};

export function ProductDetailAddToCart({
  product,
  attribution,
  initialOptionSelections = [],
}: ProductDetailAddToCartProps) {
  const { addProduct } = useCart();
  const configuratorRef = useRef<HTMLDivElement | null>(null);
  const fallbackFields: ProductPersonalizationField[] =
    product.customizable && !(product.personalizationFields?.length)
      ? [{
          id: "legacy",
          label: "Текст за персонализация",
          key: "personalization",
          type: "textarea",
          placeholder: "Напишете име, дата или текст",
          maxLength: 1000,
          priceDelta: 0,
          required: false,
          allowsWishTemplates: true,
        }]
      : [];
  const fields = product.personalizationFields?.length
    ? product.personalizationFields
    : fallbackFields;
  const [values, setValues] = useState<Record<string, string>>({});
  const [enabledOptionalFields, setEnabledOptionalFields] = useState<Set<string>>(
    () => new Set(),
  );
  const fieldInputRefs = useRef<Record<string, HTMLInputElement | HTMLTextAreaElement | null>>(
    {},
  );
  const [selectedByGroup, setSelectedByGroup] = useState<Record<string, string[]>>({});
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wishFieldId, setWishFieldId] = useState<string | null>(null);
  const [optionSelections, setOptionSelections] =
    useState<ProductOptionSelection[]>(initialOptionSelections);
  const [estimatedUnitPrice, setEstimatedUnitPrice] = useState(product.price);
  const [showMobileBar, setShowMobileBar] = useState(false);
  const colorFields = product.colorFields ?? [];
  const optionGroups = product.optionGroups ?? [];

  const flattenSelectedColors = (): SelectedProductColor[] => {
    const out: SelectedProductColor[] = [];
    colorFields.forEach((field) => {
      (selectedByGroup[field.id] ?? []).forEach((optionId) => {
        const option = field.options.find((candidate) => candidate.id === optionId);
        if (option) {
          out.push({
            fieldId: field.id,
            fieldLabel: field.label,
            groupId: field.groupId,
            groupKey: field.key,
            groupLabel: field.groupLabel,
            optionId: option.id,
            optionName: option.name,
            optionHex: option.hex,
          });
        }
      });
    });
    return out;
  };

  const validate = () => {
    for (const field of fields) {
      if (field.required && !(values[field.id] ?? "").trim()) {
        return `Попълнете полето „${field.label}“.`;
      }
    }
    for (const field of fields) {
      if (
        !field.required &&
        enabledOptionalFields.has(field.id) &&
        !(values[field.id] ?? "").trim()
      ) {
        return `Попълнете полето „${field.label}“ или изключете персонализацията.`;
      }
    }
    for (const field of colorFields) {
      const count = (selectedByGroup[field.id] ?? []).length;
      if (count < field.minSelect || count > field.maxSelect) {
        return `Изберете ${field.minSelect === field.maxSelect ? field.minSelect : `${field.minSelect}–${field.maxSelect}`} цвята за „${field.label}“.`;
      }
    }
    const optionValidation = validateProductOptionSelections(
      product.slug,
      optionGroups,
      optionSelections,
    );
    if (!optionValidation.ok) {
      return optionValidation.message;
    }
    return null;
  };

  const personalizationFields = buildPersonalizationFieldValues(
    fields,
    values,
    enabledOptionalFields,
  );
  const personalization = buildPersonalizationSummary(
    fields,
    values,
    enabledOptionalFields,
  );
  const personalizationDelta = calculatePersonalizationDelta(
    fields,
    personalizationFields,
    enabledOptionalFields,
  );
  const displayedUnitPrice = optionGroups.length
    ? estimatedUnitPrice
    : product.price + personalizationDelta;

  useEffect(() => {
    const configurator = configuratorRef.current;
    if (!configurator) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setShowMobileBar(entry.isIntersecting),
      { threshold: 0.01 },
    );
    observer.observe(configurator);
    return () => observer.disconnect();
  }, []);

  const focusPersonalizationField = (fieldId: string) => {
    requestAnimationFrame(() => {
      fieldInputRefs.current[fieldId]?.focus();
    });
  };

  const handleOptionalFieldToggle = (
    field: ProductPersonalizationField,
    enabled: boolean,
  ) => {
    if (enabled) {
      setEnabledOptionalFields((current) =>
        enableOptionalPersonalizationField(current, field.id),
      );
      focusPersonalizationField(field.id);
      return;
    }

    setEnabledOptionalFields((currentEnabled) => {
      const nextEnabled = new Set(currentEnabled);
      nextEnabled.delete(field.id);
      return nextEnabled;
    });
    setValues((currentValues) => {
      const nextValues = { ...currentValues };
      delete nextValues[field.id];
      return nextValues;
    });
    setError(null);
  };

  const handleAddToCart = () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      document
        .getElementById("product-configurator")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    addProduct(
      product,
      1,
      personalization || undefined,
      flattenSelectedColors() || undefined,
      personalizationFields,
      attribution,
      optionSelections.length ? optionSelections : undefined,
    );
    setError(null);
    setAdded(true);
    setTimeout(() => setAdded(false), 2200);
  };

  if (!product.orderable) {
    const message =
      product.fulfillmentType === "unavailable"
        ? "Този продукт временно не може да бъде поръчан."
        : product.availabilityLabel === "Изчерпан"
          ? "Този продукт временно не е наличен за поръчка. Можете да се свържете с нас за алтернатива или срок."
          : "Този продукт не може да бъде поръчан в момента.";

    return (
      <div className="mt-8 rounded-xl border border-boutique-line bg-boutique-bg px-5 py-5">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-boutique-muted">
          {product.availabilityLabel}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-boutique-muted">{message}</p>
      </div>
    );
  }

  return (
    <>
    <div
      id="product-configurator"
      ref={configuratorRef}
      className="mt-8 scroll-mt-28 rounded-2xl border border-boutique-line bg-boutique-paper p-4 sm:p-5"
    >
      {fields.length ? (
        <div className="grid gap-4">
          {fields.map((field) => {
            const value = values[field.id] ?? "";
            const showInput = shouldShowPersonalizationInput(field, enabledOptionalFields);
            const panelId = `personalization-panel-${field.id}`;
            const inputId = `personalization-${field.id}`;
            const deltaLabel = formatPriceDelta(field.priceDelta ?? 0);
            const common = {
              id: inputId,
              value,
              required: field.required,
              maxLength: field.maxLength,
              placeholder: field.placeholder ?? undefined,
              onChange: (
                event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
              ) => {
                setValues((current) => ({
                  ...current,
                  [field.id]: event.target.value.slice(0, field.maxLength),
                }));
                setError(null);
              },
              className:
                "mt-2 w-full rounded-xl border border-boutique-line bg-white px-4 py-3 text-sm text-boutique-ink outline-none focus:border-boutique-rose-deep",
              ref: (element: HTMLInputElement | HTMLTextAreaElement | null) => {
                fieldInputRefs.current[field.id] = element;
              },
            };

            if (usesPersonalizationToggle(field)) {
              const enabled = enabledOptionalFields.has(field.id);
              return (
                <div
                  key={field.id}
                  className="w-full"
                >
                  <label
                    htmlFor={`personalization-toggle-${field.id}`}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-boutique-line bg-boutique-bg px-4 py-3 transition hover:border-boutique-sage-deep/40"
                  >
                    <input
                      id={`personalization-toggle-${field.id}`}
                      className="sr-only"
                      type="checkbox"
                      checked={enabled}
                      aria-expanded={enabled}
                      aria-controls={panelId}
                      onChange={(event) =>
                        handleOptionalFieldToggle(field, event.target.checked)
                      }
                    />
                    <span
                      aria-hidden="true"
                      className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                        enabled ? "bg-boutique-sage" : "bg-boutique-line"
                      }`}
                    >
                      <span
                        className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${
                          enabled ? "translate-x-5" : ""
                        }`}
                      />
                    </span>
                    <span className="min-w-0 flex-1 text-sm font-semibold leading-5 text-boutique-ink">
                      {formatPersonalizationToggleLabel(field)}
                    </span>
                  </label>
                  <div
                    id={panelId}
                    aria-hidden={!showInput}
                    className={`grid transition-[grid-template-rows,opacity,margin] duration-200 ease-out ${
                      showInput
                        ? "mt-3 grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <label
                        htmlFor={inputId}
                        className="block text-sm font-medium text-boutique-ink"
                      >
                        <span className="sr-only">{field.label}</span>
                        {field.type === "textarea" ? (
                          <textarea {...common} rows={4} tabIndex={showInput ? 0 : -1} />
                        ) : (
                          <input
                            {...common}
                            type={field.type}
                            tabIndex={showInput ? 0 : -1}
                          />
                        )}
                        {field.type === "textarea" ? (
                          <span className="mt-1 flex items-center justify-between gap-3 text-xs text-boutique-muted">
                            <span>
                              {value.length}/{field.maxLength} знака
                            </span>
                            {field.allowsWishTemplates &&
                            (product.wishTemplates?.length ?? 0) > 0 ? (
                              <button
                                type="button"
                                onClick={() => setWishFieldId(field.id)}
                                className="rounded-full border border-boutique-rose/40 px-3 py-1 text-xs font-semibold text-boutique-rose-deep"
                              >
                                ♡ Идеи за пожелание
                              </button>
                            ) : null}
                          </span>
                        ) : null}
                      </label>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <label
                key={field.id}
                htmlFor={inputId}
                className="text-sm font-medium text-boutique-ink"
              >
                <span className="flex items-center justify-between gap-3">
                  <span>
                    {field.label}
                    {field.required ? " *" : ""}
                    {deltaLabel ? ` (${deltaLabel})` : ""}
                  </span>
                  {field.allowsWishTemplates && (product.wishTemplates?.length ?? 0) > 0 ? (
                    <button
                      type="button"
                      onClick={() => setWishFieldId(field.id)}
                      className="rounded-full border border-boutique-rose/40 px-3 py-1 text-xs font-semibold text-boutique-rose-deep"
                    >
                      ♡ Идеи за пожелание
                    </button>
                  ) : null}
                </span>
                {field.type === "textarea" ? (
                  <textarea {...common} rows={4} />
                ) : (
                  <input {...common} type={field.type} />
                )}
                {field.type === "textarea" ? (
                  <span className="mt-1 block text-right text-xs text-boutique-muted">
                    {value.length}/{field.maxLength} знака
                  </span>
                ) : null}
              </label>
            );
          })}
          {fields.some((field) => field.allowsWishTemplates) ? (
            <p className="text-xs leading-5 text-boutique-muted">
              Прегледайте и редактирайте избраното пожелание спрямо получателя – име, пол,
              възраст и конкретен повод.
            </p>
          ) : null}
        </div>
      ) : null}

      {optionGroups.length ? (
        <ProductOptionsSelector
          basePrice={product.price + personalizationDelta}
          variantDisplayBasePrice={product.price}
          groups={optionGroups}
          value={optionSelections}
          onChange={setOptionSelections}
          onEstimatedPriceChange={setEstimatedUnitPrice}
        />
      ) : null}

      {!optionGroups.length && personalizationDelta > 0 ? (
        <p className="mt-5 text-sm text-boutique-muted">
          Ориентировъчна цена:{" "}
          <strong className="text-boutique-ink">
            {(product.price + personalizationDelta).toFixed(2).replace(".", ",")} €
          </strong>
        </p>
      ) : null}

      {colorFields.length ? (
        <div className="mt-7 grid gap-5 sm:grid-cols-2">
          {colorFields.map((field) => (
            <fieldset key={field.id}>
              <legend className="text-sm font-semibold text-boutique-ink">{field.label}</legend>
              <div className="mt-3 flex flex-wrap gap-3">
                {field.options.map((option) => {
                  const selected = (selectedByGroup[field.id] ?? []).includes(option.id);
                  return (
                    <label key={option.id} className="cursor-pointer text-center text-xs text-boutique-muted">
                      <input
                        className="sr-only"
                        type={field.maxSelect <= 1 ? "radio" : "checkbox"}
                        name={`color-${field.id}`}
                        checked={selected}
                        onChange={(event) => {
                          const current = selectedByGroup[field.id] ?? [];
                          const next = field.maxSelect <= 1
                            ? event.target.checked ? [option.id] : []
                            : event.target.checked
                              ? [...current, option.id].slice(0, field.maxSelect)
                              : current.filter((id) => id !== option.id);
                          setSelectedByGroup((state) => ({ ...state, [field.id]: next }));
                          setError(null);
                        }}
                      />
                      <span
                        className={`mx-auto block h-9 w-9 rounded-full border-2 ${
                          selected ? "border-boutique-sage-deep ring-2 ring-boutique-sage/30" : "border-white ring-1 ring-boutique-line"
                        }`}
                        style={{ backgroundColor: option.hex ?? "#eee8df" }}
                      />
                      <span className="mt-1 block">{option.name}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>
      ) : null}

      {error ? <p className="mt-5 text-sm font-medium text-red-700">{error}</p> : null}
      <button
        type="button"
        aria-live="polite"
        onClick={handleAddToCart}
        className={`mt-5 w-full rounded-xl px-8 py-3.5 text-sm font-semibold text-white transition ${
          added
            ? "bg-boutique-sage shadow-boutique-sm"
            : "bg-boutique-sage-deep hover:bg-boutique-ink"
        }`}
      >
        {added ? "✓ Добавено в количката" : "Добави в количката"}
      </button>

      {wishFieldId ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Избор на готово пожелание"
          className="fixed inset-0 z-50 grid place-items-center bg-boutique-ink/45 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setWishFieldId(null);
          }}
        >
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-heading text-3xl text-boutique-ink">
                  Избери готово пожелание
                </h2>
                <p className="mt-2 text-sm text-boutique-muted">
                  След избора можете свободно да редактирате текста.
                </p>
              </div>
              <button type="button" onClick={() => setWishFieldId(null)} className="text-2xl">×</button>
            </div>
            <div className="mt-6 grid gap-3">
              {(product.wishTemplates ?? []).map((wish) => (
                <article key={wish.id} className="rounded-xl border border-boutique-line bg-boutique-paper p-4">
                  <p className="whitespace-pre-line text-sm leading-6 text-boutique-muted">
                    {wish.body}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const field = fields.find((item) => item.id === wishFieldId);
                      setValues((current) => ({
                        ...current,
                        [wishFieldId]: wish.body.slice(0, field?.maxLength ?? 1000),
                      }));
                      setError(null);
                      setWishFieldId(null);
                    }}
                    className="mt-3 rounded-lg bg-boutique-sage-deep px-4 py-2 text-xs font-semibold text-white"
                  >
                    Избери текста
                  </button>
                </article>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
    {showMobileBar ? (
      <div
        className="fixed inset-x-0 bottom-0 z-50 border-t border-boutique-line bg-boutique-paper/95 px-4 py-3 shadow-[0_-10px_30px_-20px_rgb(44_40_37_/0.45)] backdrop-blur sm:hidden"
        aria-label="Бързо добавяне в количката"
      >
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-boutique-muted">
              Ориентировъчна цена
            </p>
            <p className="font-heading text-xl text-boutique-ink">
              {formatEur(displayedUnitPrice)}
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddToCart}
            className={`min-h-12 shrink-0 rounded-xl px-5 text-sm font-semibold text-white transition ${
              added
                ? "bg-boutique-sage shadow-boutique-sm"
                : "bg-boutique-sage-deep hover:bg-boutique-ink"
            }`}
          >
            {added ? "✓ Добавено" : "Добави"}
          </button>
        </div>
      </div>
    ) : null}
    </>
  );
}
