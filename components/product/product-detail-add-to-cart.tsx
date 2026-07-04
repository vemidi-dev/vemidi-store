"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { ProductColorQuantitySelector } from "@/components/product/product-color-quantity-selector";
import { useCart } from "@/components/cart/cart-provider";
import { ProductOptionsSelector } from "@/components/product/product-options-selector";
import type { CampaignAttribution } from "@/lib/campaign-attribution";
import type { Product } from "@/lib/catalog";
import type { ProductUpsellOffer } from "@/lib/storefront/product-upsells";
import type { ProductOptionSelection } from "@/lib/product-options";
import {
  getProductConfigurationDraftKey,
  mergeProductOptionSelections,
  parseProductConfigurationDraft,
  resolveProductConfigurationDraft,
} from "@/lib/product-configuration-draft";
import { validateProductOptionSelections } from "@/lib/product-option-validation";
import type { SelectedProductColor } from "@/lib/product-colors";
import {
  filterSelectedColorsForOrder,
  flattenSelectedColorsFromQuantities,
  isQuantityColorField,
  validateColorQuantities,
} from "@/lib/product-color-quantities";
import type { ColorQuantitiesByOptionId } from "@/lib/product-color-quantities";
import { formatPriceDelta } from "@/lib/product-option-pricing";
import { formatEur } from "@/lib/format-eur";
import { getProductPath } from "@/lib/product-url";
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
import {
  buildWishTemplateOccasionFilters,
  filterStorefrontWishTemplates,
  shouldShowWishOccasionFilters,
  type WishTemplateOccasionFilter,
} from "@/lib/product-wish-templates";

type ProductDetailAddToCartProps = {
  product: Product;
  upsellOffers?: ProductUpsellOffer[];
  attribution?: CampaignAttribution;
  initialOptionSelections?: ProductOptionSelection[];
  layout?: "card" | "embedded";
};

function clampUpsellQuantity(value: number, maxQuantity: number) {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.min(maxQuantity, Math.max(1, Math.trunc(value)));
}

export function ProductDetailAddToCart({
  product,
  upsellOffers = [],
  attribution,
  initialOptionSelections = [],
  layout = "card",
}: ProductDetailAddToCartProps) {
  const embedded = layout === "embedded";
  const { addProduct, lines, ready: cartReady } = useCart();
  const configuratorRef = useRef<HTMLDivElement | null>(null);
  const fallbackFields = useMemo<ProductPersonalizationField[]>(
    () => product.customizable && !(product.personalizationFields?.length)
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
      : [],
    [product.customizable, product.personalizationFields],
  );
  const fields = useMemo(
    () => product.personalizationFields?.length
      ? product.personalizationFields
      : fallbackFields,
    [fallbackFields, product.personalizationFields],
  );
  const [values, setValues] = useState<Record<string, string>>({});
  const [enabledOptionalFields, setEnabledOptionalFields] = useState<Set<string>>(
    () => new Set(),
  );
  const fieldInputRefs = useRef<Record<string, HTMLInputElement | HTMLTextAreaElement | null>>(
    {},
  );
  const [selectedByGroup, setSelectedByGroup] = useState<Record<string, string[]>>({});
  const [expandedColorFields, setExpandedColorFields] = useState<Set<string>>(
    () => new Set(),
  );
  const [quantitiesByField, setQuantitiesByField] = useState<
    Record<string, ColorQuantitiesByOptionId>
  >({});
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUpsellIds, setSelectedUpsellIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [upsellQuantities, setUpsellQuantities] = useState<Record<string, number>>(
    () =>
      Object.fromEntries(
        upsellOffers.map((offer) => [offer.id, offer.suggestedQuantity]),
      ),
  );
  const [wishFieldId, setWishFieldId] = useState<string | null>(null);
  const [wishOccasionFilter, setWishOccasionFilter] =
    useState<WishTemplateOccasionFilter>("all");
  const wishTemplates = product.wishTemplates ?? [];
  const wishOccasionFilters = useMemo(
    () => buildWishTemplateOccasionFilters(wishTemplates),
    [wishTemplates],
  );
  const showWishOccasionFilters = shouldShowWishOccasionFilters(wishOccasionFilters);
  const filteredWishTemplates = useMemo(
    () => filterStorefrontWishTemplates(wishTemplates, wishOccasionFilter),
    [wishOccasionFilter, wishTemplates],
  );

  useEffect(() => {
    if (wishFieldId) {
      setWishOccasionFilter("all");
    }
  }, [wishFieldId]);

  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!wishFieldId) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [wishFieldId]);
  const [optionSelections, setOptionSelections] =
    useState<ProductOptionSelection[]>(initialOptionSelections);
  const [estimatedUnitPrice, setEstimatedUnitPrice] = useState(product.price);
  const [showMobileBar, setShowMobileBar] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const colorFields = useMemo(() => product.colorFields ?? [], [product.colorFields]);
  const optionGroups = useMemo(() => product.optionGroups ?? [], [product.optionGroups]);

  useEffect(() => {
    if (!cartReady) {
      return;
    }

    let storedDraft = null;
    try {
      storedDraft = parseProductConfigurationDraft(
        window.localStorage.getItem(getProductConfigurationDraftKey(product.id)),
      );
    } catch {
      // Storage can be unavailable in strict privacy modes; the configurator still works.
    }

    const cartLine = lines.find((line) => line.productId === product.id) ?? null;
    const draft = resolveProductConfigurationDraft(storedDraft, cartLine, fields);

    if (draft) {
      try {
        window.localStorage.setItem(
          getProductConfigurationDraftKey(product.id),
          JSON.stringify(draft),
        );
      } catch {
        // Keep selection usable even if the browser refuses persistent storage.
      }

      const knownFields = new Map(fields.map((field) => [field.id, field]));
      const restoredValues = Object.fromEntries(
        Object.entries(draft.values)
          .filter(([fieldId]) => knownFields.has(fieldId))
          .map(([fieldId, value]) => [
            fieldId,
            value.slice(0, knownFields.get(fieldId)?.maxLength ?? 1000),
          ]),
      );
      const optionalFieldIds = new Set(
        fields
          .filter((field) => !field.required)
          .map((field) => field.id),
      );
      const restoredEnabledFields = new Set(
        draft.enabledOptionalFieldIds.filter((fieldId) => optionalFieldIds.has(fieldId)),
      );
      const restoredColors = Object.fromEntries(
        colorFields.map((field) => {
          if (isQuantityColorField(field)) {
            return [field.id, [] as string[]];
          }

          const knownOptionIds = new Set(field.options.map((option) => option.id));
          return [
            field.id,
            (draft.selectedColorOptionIdsByFieldId[field.id] ?? [])
              .filter((optionId) => knownOptionIds.has(optionId))
              .slice(0, field.maxSelect),
          ];
        }),
      ) as Record<string, string[]>;
      const restoredQuantities = Object.fromEntries(
        colorFields.map((field) => {
          if (!isQuantityColorField(field)) {
            return [field.id, {} satisfies ColorQuantitiesByOptionId];
          }

          const knownOptionIds = new Set(field.options.map((option) => option.id));
          const fromDraft = draft.selectedColorQuantitiesByFieldId[field.id] ?? {};
          return [
            field.id,
            Object.fromEntries(
              Object.entries(fromDraft).filter(([optionId]) => knownOptionIds.has(optionId)),
            ) satisfies ColorQuantitiesByOptionId,
          ];
        }),
      ) as Record<string, ColorQuantitiesByOptionId>;
      const restoredOptions = draft.optionSelections.filter((selection) => {
        const group = optionGroups.find((candidate) => candidate.id === selection.groupId);
        if (!group) {
          return false;
        }
        const knownValueIds = new Set(group.values.map((value) => value.id));
        return selection.valueIds.every((valueId) => knownValueIds.has(valueId));
      });

      setValues(restoredValues);
      setEnabledOptionalFields(restoredEnabledFields);
      setSelectedByGroup(restoredColors);
      setQuantitiesByField(restoredQuantities);
      setOptionSelections(
        mergeProductOptionSelections(restoredOptions, initialOptionSelections),
      );
    }

    setDraftReady(true);
  }, [
    cartReady,
    colorFields,
    fields,
    initialOptionSelections,
    lines,
    optionGroups,
    product.id,
  ]);

  useEffect(() => {
    if (!draftReady) {
      return;
    }

    try {
      window.localStorage.setItem(
        getProductConfigurationDraftKey(product.id),
        JSON.stringify({
          values,
          enabledOptionalFieldIds: [...enabledOptionalFields],
          selectedColorOptionIdsByFieldId: selectedByGroup,
          selectedColorQuantitiesByFieldId: quantitiesByField,
          optionSelections,
        }),
      );
    } catch {
      // Keep selection usable even if the browser refuses persistent storage.
    }
  }, [
    draftReady,
    enabledOptionalFields,
    optionSelections,
    product.id,
    selectedByGroup,
    quantitiesByField,
    values,
  ]);

  const flattenSelectedColors = (): SelectedProductColor[] => {
    const quantityColors = flattenSelectedColorsFromQuantities(
      colorFields,
      quantitiesByField,
    );
    const choiceColors: SelectedProductColor[] = [];

    colorFields.forEach((field) => {
      if (isQuantityColorField(field)) {
        return;
      }

      (selectedByGroup[field.id] ?? []).forEach((optionId) => {
        const option = field.options.find((candidate) => candidate.id === optionId);
        if (option) {
          choiceColors.push({
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

    return [...quantityColors, ...choiceColors];
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
      if (isQuantityColorField(field)) {
        const quantityError = validateColorQuantities(
          field,
          quantitiesByField[field.id] ?? {},
        );
        if (quantityError) {
          return quantityError;
        }
        continue;
      }

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
  const canAddToCart = validate() === null;
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
      filterSelectedColorsForOrder(flattenSelectedColors()) || undefined,
      personalizationFields,
      attribution,
      optionSelections.length ? optionSelections : undefined,
    );
    upsellOffers
      .filter((offer) => selectedUpsellIds.has(offer.id) && offer.product.orderable)
      .forEach((offer) => {
        addProduct(
          offer.product,
          clampUpsellQuantity(
            upsellQuantities[offer.id] ?? offer.suggestedQuantity,
            offer.maxQuantity,
          ),
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          {
            unitPrice: offer.specialPrice,
            maxCartQuantity: offer.maxQuantity,
            suppressToast: true,
            upsell: {
              offerId: offer.id,
              sourceProductId: product.id,
              sourceProductTitle: product.title,
              originalPrice: offer.product.price,
              specialPrice: offer.specialPrice,
            },
          },
        );
      });
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
      <div
        className={
          embedded
            ? "mt-6 rounded-xl border border-boutique-line/80 bg-boutique-bg/50 px-4 py-4"
            : "rounded-xl border border-boutique-line bg-boutique-bg px-5 py-5"
        }
      >
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
      className={
        embedded
          ? "scroll-mt-28 mt-6 w-full"
          : "scroll-mt-28 rounded-2xl border border-boutique-line bg-boutique-paper p-4 transition-shadow duration-300 ease-out hover:shadow-boutique-sm motion-reduce:transition-none sm:p-5"
      }
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
                "mt-2 w-full rounded-xl border border-boutique-line bg-white px-4 py-3 text-sm text-boutique-ink outline-none transition duration-200 ease-out focus:border-boutique-sage-deep focus:ring-2 focus:ring-boutique-sage/25 motion-reduce:transition-none",
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
                    className="flex cursor-pointer flex-col items-start gap-3 rounded-xl border border-boutique-line bg-boutique-bg px-4 py-3 transition duration-200 ease-out hover:border-boutique-sage-deep/40 hover:bg-white hover:shadow-boutique-sm motion-reduce:transition-none"
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
                      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ease-out motion-reduce:transition-none ${
                        enabled ? "bg-boutique-sage" : "bg-boutique-line"
                      }`}
                    >
                      <span
                        className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out motion-reduce:transition-none ${
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
                    <div
                      className={showInput ? "overflow-visible p-0.5" : "overflow-hidden"}
                    >
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
                    className="rounded-full border border-boutique-rose/40 px-3 py-1 text-xs font-semibold text-boutique-rose-deep transition duration-200 ease-out hover:border-boutique-rose-deep hover:bg-boutique-blush motion-reduce:transition-none"
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
        <div className={`mt-7 grid gap-6 ${!embedded && colorFields.length > 1 ? "lg:grid-cols-2" : ""}`}>
          {colorFields.map((field) =>
            isQuantityColorField(field) ? (
              <ProductColorQuantitySelector
                key={field.id}
                field={field}
                quantities={quantitiesByField[field.id] ?? {}}
                onChange={(quantities) => {
                  setQuantitiesByField((state) => ({ ...state, [field.id]: quantities }));
                  setError(null);
                }}
              />
            ) : (
              <fieldset
                key={field.id}
                className="rounded-2xl border border-boutique-line bg-white/60 p-4 transition-shadow duration-300 ease-out hover:shadow-boutique-sm motion-reduce:transition-none"
              >
                <legend className="px-1 text-sm font-semibold text-boutique-ink">
                  {field.label}
                </legend>
                <div
                  id={`color-options-${field.id}`}
                  className={`mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 ${embedded ? "lg:grid-cols-4" : "lg:grid-cols-6"}`}
                >
                  {field.options
                    .filter((option, index) =>
                      expandedColorFields.has(field.id) ||
                      index < 8 ||
                      (selectedByGroup[field.id] ?? []).includes(option.id),
                    )
                    .map((option) => {
                      const selected = (selectedByGroup[field.id] ?? []).includes(option.id);
                      return (
                        <label
                          key={option.id}
                          className="group cursor-pointer rounded-2xl p-2 text-center text-xs text-boutique-muted transition duration-200 ease-out hover:bg-boutique-bg motion-reduce:transition-none"
                        >
                          <input
                            className="peer sr-only"
                            type={field.maxSelect <= 1 ? "radio" : "checkbox"}
                            name={`color-${field.id}`}
                            checked={selected}
                            onChange={(event) => {
                              const current = selectedByGroup[field.id] ?? [];
                              const next = field.maxSelect <= 1
                                ? event.target.checked
                                  ? [option.id]
                                  : []
                                : event.target.checked
                                  ? [...current, option.id].slice(0, field.maxSelect)
                                  : current.filter((id) => id !== option.id);
                              setSelectedByGroup((state) => ({ ...state, [field.id]: next }));
                              setError(null);
                            }}
                          />
                          <span
                            className={`relative mx-auto grid h-12 w-12 place-items-center rounded-full border-4 border-white shadow-sm ring-1 transition duration-200 ease-out group-hover:scale-[1.04] peer-focus-visible:ring-2 peer-focus-visible:ring-boutique-sage-deep motion-reduce:transition-none motion-reduce:group-hover:scale-100 ${
                              selected
                                ? "ring-2 ring-boutique-sage-deep"
                                : "ring-boutique-line"
                            }`}
                            style={{ backgroundColor: option.hex ?? "#eee8df" }}
                          >
                            {selected ? (
                              <span
                                aria-hidden="true"
                                className="grid h-5 w-5 place-items-center rounded-full bg-white/90 text-[0.65rem] font-bold text-boutique-sage-deep shadow-sm"
                              >
                                ✓
                              </span>
                            ) : null}
                          </span>
                          <span
                            className={`mt-2 block leading-4 ${
                              selected ? "font-semibold text-boutique-ink" : ""
                            }`}
                          >
                            {option.name}
                          </span>
                        </label>
                      );
                    })}
                </div>
                {field.options.length > 8 ? (
                  <button
                    type="button"
                    aria-expanded={expandedColorFields.has(field.id)}
                    aria-controls={`color-options-${field.id}`}
                    onClick={() => {
                      setExpandedColorFields((current) => {
                        const next = new Set(current);
                        if (next.has(field.id)) next.delete(field.id);
                        else next.add(field.id);
                        return next;
                      });
                    }}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-boutique-line bg-white px-4 py-3 text-sm font-semibold text-boutique-ink transition duration-200 ease-out hover:-translate-y-1 hover:border-boutique-sage-deep hover:text-boutique-sage-deep hover:shadow-[0_12px_24px_-10px_rgb(44_40_37_/0.16)] active:translate-y-0 active:shadow-sm motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                  >
                    {expandedColorFields.has(field.id)
                      ? "Покажете по-малко"
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
        </div>
      ) : null}

      {error ? <p className="mt-5 text-sm font-medium text-red-700">{error}</p> : null}
      <button
        type="button"
        aria-live="polite"
        disabled={!canAddToCart}
        onClick={handleAddToCart}
        className={`mt-5 w-full rounded-xl px-8 py-3.5 text-sm font-semibold text-white transition duration-200 ease-out hover:-translate-y-1 hover:shadow-[0_16px_32px_-12px_rgb(44_40_37_/0.22)] active:translate-y-0 active:shadow-sm disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${
          added
            ? "bg-boutique-sage shadow-boutique-sm"
            : "bg-boutique-sage-deep hover:bg-boutique-ink"
        }`}
      >
        {added ? "✓ Добавено в количката" : "Добавете в количката"}
      </button>

      {upsellOffers.length ? (
        <section
          aria-labelledby="product-upsell-title"
          className="mt-4 rounded-2xl border border-boutique-line bg-boutique-bg/60 p-4"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-boutique-accent">
            Специална оферта
          </p>
          <h2
            id="product-upsell-title"
            className="mt-1 font-heading text-2xl text-boutique-ink"
          >
            Добавете към подаръка
          </h2>
          <div className="mt-4 grid gap-3">
            {upsellOffers.map((offer) => {
              const selected = selectedUpsellIds.has(offer.id);
              const quantity = clampUpsellQuantity(
                upsellQuantities[offer.id] ?? offer.suggestedQuantity,
                offer.maxQuantity,
              );
              const image = offer.product.images.find((item) => item.src);

              return (
                <article
                  key={offer.id}
                  className={`grid grid-cols-[auto_4rem_minmax(0,1fr)] gap-3 rounded-xl border bg-white p-3 transition ${
                    selected
                      ? "border-boutique-sage-deep shadow-boutique-sm"
                      : "border-boutique-line"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    disabled={!offer.product.orderable}
                    aria-label={`Добавете ${offer.product.title}`}
                    onChange={(event) => {
                      setSelectedUpsellIds((current) => {
                        const next = new Set(current);
                        if (event.target.checked) {
                          next.add(offer.id);
                        } else {
                          next.delete(offer.id);
                        }
                        return next;
                      });
                    }}
                    className="mt-6 h-5 w-5 rounded border-boutique-line text-boutique-sage-deep"
                  />
                  <Link
                    href={getProductPath(offer.product.slug)}
                    className="relative aspect-square overflow-hidden rounded-lg border border-boutique-line bg-boutique-paper"
                  >
                    {image ? (
                      <Image
                        src={image.src}
                        alt={image.alt ?? offer.product.title}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="grid h-full w-full place-items-center text-sm text-boutique-muted">
                        ◇
                      </span>
                    )}
                  </Link>
                  <div className="min-w-0">
                    <Link href={getProductPath(offer.product.slug)}>
                      <h3 className="text-sm font-semibold leading-snug text-boutique-ink transition hover:text-boutique-sage-deep">
                        {offer.title ?? offer.product.title}
                      </h3>
                    </Link>
                    {offer.description ? (
                      <p className="mt-1 text-xs leading-5 text-boutique-muted">
                        {offer.description}
                      </p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="font-heading text-xl text-boutique-sage-deep">
                        {formatEur(offer.specialPrice)}
                      </span>
                      {offer.product.price > offer.specialPrice ? (
                        <span className="text-xs text-boutique-muted line-through">
                          {formatEur(offer.product.price)}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-3 inline-flex items-center rounded-lg border border-boutique-line bg-boutique-paper">
                      <button
                        type="button"
                        aria-label="Намалете количеството"
                        disabled={!selected}
                        onClick={() =>
                          setUpsellQuantities((current) => ({
                            ...current,
                            [offer.id]: clampUpsellQuantity(
                              quantity - 1,
                              offer.maxQuantity,
                            ),
                          }))
                        }
                        className="grid h-8 w-8 place-items-center text-lg text-boutique-muted transition hover:text-boutique-ink disabled:opacity-40"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={offer.maxQuantity}
                        disabled={!selected}
                        value={quantity}
                        onChange={(event) =>
                          setUpsellQuantities((current) => ({
                            ...current,
                            [offer.id]: clampUpsellQuantity(
                              Number(event.target.value),
                              offer.maxQuantity,
                            ),
                          }))
                        }
                        className="h-8 w-10 border-x border-boutique-line bg-transparent text-center text-sm text-boutique-ink outline-none disabled:opacity-50"
                      />
                      <button
                        type="button"
                        aria-label="Увеличете количеството"
                        disabled={!selected || quantity >= offer.maxQuantity}
                        onClick={() =>
                          setUpsellQuantities((current) => ({
                            ...current,
                            [offer.id]: clampUpsellQuantity(
                              quantity + 1,
                              offer.maxQuantity,
                            ),
                          }))
                        }
                        className="grid h-8 w-8 place-items-center text-lg text-boutique-muted transition hover:text-boutique-ink disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>
                    <p className="mt-1 text-[11px] text-boutique-muted">
                      Максимум {offer.maxQuantity} бр.
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
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
            disabled={!canAddToCart}
            onClick={handleAddToCart}
            className={`min-h-12 shrink-0 rounded-xl px-5 text-sm font-semibold text-white transition duration-200 ease-out hover:-translate-y-1 hover:shadow-[0_14px_28px_-10px_rgb(44_40_37_/0.2)] active:translate-y-0 active:shadow-sm disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${
              added
                ? "bg-boutique-sage shadow-boutique-sm"
                : "bg-boutique-sage-deep hover:bg-boutique-ink"
            }`}
          >
            {added ? "✓ Добавено" : "Добавете"}
          </button>
        </div>
      </div>
    ) : null}
    {wishFieldId && portalReady
      ? createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Избор на готово пожелание"
            className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-boutique-ink/45 p-4 pt-[6vh] sm:p-6 sm:pt-[6vh]"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setWishFieldId(null);
              }
            }}
          >
            <div className="flex w-full max-w-2xl max-h-[min(88dvh,44rem)] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
              <div className="shrink-0 px-6 pb-4 pt-6 sm:px-8 sm:pt-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-heading text-3xl text-boutique-ink">
                      Изберете готово пожелание
                    </h2>
                    <p className="mt-2 text-sm text-boutique-muted">
                      След избора можете свободно да редактирате текста.
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="Затвори"
                    onClick={() => setWishFieldId(null)}
                    className="shrink-0 text-2xl leading-none text-boutique-muted transition hover:text-boutique-ink"
                  >
                    ×
                  </button>
                </div>
                {showWishOccasionFilters ? (
                  <div
                    className="mt-5 flex flex-wrap gap-2"
                    role="group"
                    aria-label="Филтър по повод"
                  >
                    <button
                      type="button"
                      aria-pressed={wishOccasionFilter === "all"}
                      onClick={() => setWishOccasionFilter("all")}
                      className={`inline-flex rounded-full border px-3 py-1 text-sm font-medium transition motion-reduce:transition-none ${
                        wishOccasionFilter === "all"
                          ? "border-boutique-sage-deep bg-boutique-sage-deep/10 text-boutique-sage-deep"
                          : "border-boutique-line bg-white text-boutique-ink hover:border-boutique-sage-deep/40 hover:text-boutique-sage-deep"
                      }`}
                    >
                      Всички
                    </button>
                    {wishOccasionFilters.map((occasion) => {
                      const isSelected = wishOccasionFilter === occasion.id;

                      return (
                        <button
                          key={occasion.id}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => setWishOccasionFilter(occasion.id)}
                          className={`inline-flex rounded-full border px-3 py-1 text-sm font-medium transition motion-reduce:transition-none ${
                            isSelected
                              ? "border-boutique-sage-deep bg-boutique-sage-deep/10 text-boutique-sage-deep"
                              : "border-boutique-line bg-white text-boutique-ink hover:border-boutique-sage-deep/40 hover:text-boutique-sage-deep"
                          }`}
                        >
                          {occasion.name}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 sm:px-8 sm:pb-8">
                <div className="grid gap-3">
                  {filteredWishTemplates.map((wish) => (
                    <article
                      key={wish.id}
                      className="rounded-xl border border-boutique-line bg-boutique-paper p-4"
                    >
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
                        className="mt-3 rounded-lg bg-boutique-sage-deep px-4 py-2 text-xs font-semibold text-white transition duration-200 ease-out hover:bg-boutique-ink motion-reduce:transition-none"
                      >
                        Изберете текста
                      </button>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null}
    </>
  );
}
