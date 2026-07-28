"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  ProductDetailColorFields,
  PRODUCT_LEFT_COLORS_SLOT_ID,
} from "@/components/product/product-detail-color-fields";
import { useCart } from "@/components/cart/cart-provider";
import { ProductOptionsSelector } from "@/components/product/product-options-selector";
import type { CampaignAttribution } from "@/lib/campaign-attribution";
import type { Product } from "@/lib/catalog";
import type { ProductUpsellOffer } from "@/lib/storefront/product-upsells";
import type { ProductOptionSelection } from "@/lib/product-options";
import {
  buildDefaultOptionSelections,
  buildProductOptionDefaultsSignature,
} from "@/lib/product-options";
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
  formatSelectedColorQuantityLabel,
  isQuantityColorField,
  validateColorQuantities,
} from "@/lib/product-color-quantities";
import type { ColorQuantitiesByOptionId } from "@/lib/product-color-quantities";
import { formatPriceDelta } from "@/lib/product-option-pricing";
import { shouldUseMaterialOptionCards } from "@/lib/product-option-layout";
import {
  hasQuantityPriceTiers,
  resolveQuantityTierDisplayUnitPrice,
  resolveQuantityUnitPrice,
} from "@/lib/product-quantity-pricing";
import {
  resolvePreparedVariantsUnitPrices,
  resolvePreparedVariantUnitPrice,
  resolvePreparedVariantsTotalPrice,
} from "@/lib/product-prepared-variants";
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
  upsellSectionTitle?: string | null;
  attribution?: CampaignAttribution;
  initialOptionSelections?: ProductOptionSelection[];
  layout?: "card" | "embedded";
  usesMaterialStockLayout?: boolean;
  priceSummaryLabel?: string;
  priceSummaryNote?: string | null;
  personalizationDetailsOpen?: boolean;
};

type PreparedProductVariant = {
  id: string;
  quantity: number;
  unitPrice: number;
  optionDelta?: number;
  personalizationDelta?: number;
  personalization?: string;
  selectedColors?: SelectedProductColor[];
  personalizationFields?: ReturnType<typeof buildPersonalizationFieldValues>;
  optionSelections?: ProductOptionSelection[];
  summary: string[];
};

type ColorFieldsPlacement = "inline" | "desktop-sidebar";

function clampUpsellQuantity(value: number, maxQuantity: number) {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.min(maxQuantity, Math.max(1, Math.trunc(value)));
}

function clampProductQuantity(value: number, maxQuantity: number) {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.min(maxQuantity, Math.max(1, Math.trunc(value)));
}

export function ProductDetailAddToCart({
  product,
  upsellOffers = [],
  upsellSectionTitle = null,
  attribution,
  initialOptionSelections = [],
  layout = "card",
  usesMaterialStockLayout = false,
  priceSummaryLabel = "Ориентировъчна цена",
  priceSummaryNote = "(окончателната се потвърждава при поръчка)",
  personalizationDetailsOpen,
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
  const [quantity, setQuantity] = useState(1);
  const [quantityInput, setQuantityInput] = useState("1");
  const [preparedVariants, setPreparedVariants] = useState<PreparedProductVariant[]>([]);
  const [showMobileBar, setShowMobileBar] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const colorFields = useMemo(() => product.colorFields ?? [], [product.colorFields]);
  const optionGroups = useMemo(() => product.optionGroups ?? [], [product.optionGroups]);
  const useMaterialCards = useMemo(
    () => usesMaterialStockLayout || shouldUseMaterialOptionCards(product, optionGroups),
    [optionGroups, product, usesMaterialStockLayout],
  );
  const [leftColorsSlot, setLeftColorsSlot] = useState<HTMLElement | null>(null);
  const [desktopColorPortalActive, setDesktopColorPortalActive] = useState(false);
  const defaultOptionSelections = useMemo(
    () => buildDefaultOptionSelections(optionGroups),
    [optionGroups],
  );
  const optionDefaultsSignature = useMemo(
    () => buildProductOptionDefaultsSignature(optionGroups),
    [optionGroups],
  );
  const currentProductQuantityInCart = useMemo(
    () =>
      lines
        .filter((line) => line.productId === product.id)
        .reduce((total, line) => total + line.quantity, 0),
    [lines, product.id],
  );
  const productStockLimit =
    typeof product.maxCartQuantity === "number" &&
    Number.isFinite(product.maxCartQuantity)
      ? Math.max(0, Math.floor(product.maxCartQuantity))
      : null;
  const remainingStock =
    productStockLimit === null
      ? null
      : Math.max(0, productStockLimit - currentProductQuantityInCart);
  const showQuantitySelector = Boolean(product.allowQuantitySelector);
  const usePreparedVariants =
    showQuantitySelector && product.fulfillmentType === "stocked";
  const preparedQuantityTotal = preparedVariants.reduce(
    (total, variant) => total + variant.quantity,
    0,
  );
  const remainingStockForSelection =
    usePreparedVariants && remainingStock !== null
      ? Math.max(0, remainingStock - preparedQuantityTotal)
      : remainingStock;
  const maxSelectableQuantity =
    remainingStockForSelection === null ? 99 : Math.max(1, remainingStockForSelection);
  const stockSelectionBlocked =
    remainingStockForSelection !== null && remainingStockForSelection <= 0;

  const handleOptionSelectionsChange = (nextSelections: ProductOptionSelection[]) => {
    setOptionSelections(nextSelections);
    if (showQuantitySelector) {
      setQuantity(1);
    }
  };

  useEffect(() => {
    setQuantity((current) => clampProductQuantity(current, maxSelectableQuantity));
  }, [maxSelectableQuantity]);

  useEffect(() => {
    setQuantityInput(String(quantity));
  }, [quantity]);

  useEffect(() => {
    if (!showQuantitySelector) {
      setQuantity(1);
    }
  }, [showQuantitySelector]);

  useEffect(() => {
    setPreparedVariants([]);
  }, [product.id]);

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
    const draft = resolveProductConfigurationDraft(
      storedDraft,
      cartLine,
      fields,
      optionDefaultsSignature,
    );

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
        mergeProductOptionSelections(
          defaultOptionSelections,
          mergeProductOptionSelections(restoredOptions, initialOptionSelections),
        ),
      );
    }

    setDraftReady(true);
  }, [
    cartReady,
    colorFields,
    defaultOptionSelections,
    fields,
    initialOptionSelections,
    lines,
    optionDefaultsSignature,
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
          optionDefaultsSignature,
        }),
      );
    } catch {
      // Keep selection usable even if the browser refuses persistent storage.
    }
  }, [
    draftReady,
    enabledOptionalFields,
    optionSelections,
    optionDefaultsSignature,
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
  const canPrepareVariant = canAddToCart && !stockSelectionBlocked;
  const canSubmitAddToCart = usePreparedVariants
    ? preparedVariants.length > 0
    : canPrepareVariant;
  const selectedQuantity = showQuantitySelector ? quantity : 1;
  const quantityBasePrice = resolveQuantityUnitPrice(
    product.price,
    product.quantityPriceTiers,
    selectedQuantity,
  );
  const optionDelta = optionGroups.length
    ? Math.max(0, estimatedUnitPrice - product.price - personalizationDelta)
    : 0;
  const displayedUnitPrice = quantityBasePrice + optionDelta + personalizationDelta;
  const displayedLinePrice = displayedUnitPrice * selectedQuantity;
  const showQuantityPriceTiers =
    showQuantitySelector && hasQuantityPriceTiers(product.quantityPriceTiers);
  const personalizationSectionOrder = showQuantityPriceTiers
    ? useMaterialCards
      ? "order-50 lg:order-40"
      : "order-50 lg:order-35"
    : useMaterialCards
      ? "order-50 lg:order-40"
      : "order-50 lg:order-10";
  const quantityTiersSectionOrder = "order-40 lg:order-30";
  const quantitySelectorOrder = useMaterialCards ? "order-30 lg:order-20" : "order-30 lg:order-60";
  const quantityDiscountPerItem = Math.max(0, product.price - quantityBasePrice);
  const preparedVariantUnitPrices = resolvePreparedVariantsUnitPrices(
    product.price,
    product.quantityPriceTiers,
    preparedVariants,
  );
  const getPreparedVariantUnitPrice = (
    variant: PreparedProductVariant,
    index: number,
  ) =>
    preparedVariantUnitPrices[index] ??
    resolvePreparedVariantUnitPrice(
      product.price,
      product.quantityPriceTiers,
      variant,
    );
  const preparedVariantsTotalPrice = resolvePreparedVariantsTotalPrice(
    product.price,
    product.quantityPriceTiers,
    preparedVariants,
  );

  useEffect(() => {
    if (!useMaterialCards) {
      setLeftColorsSlot(null);
      return;
    }

    setLeftColorsSlot(document.getElementById(PRODUCT_LEFT_COLORS_SLOT_ID));
  }, [product.id, useMaterialCards]);

  useEffect(() => {
    if (!useMaterialCards) {
      setDesktopColorPortalActive(false);
      return;
    }

    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const sync = () => setDesktopColorPortalActive(mediaQuery.matches);

    sync();
    mediaQuery.addEventListener("change", sync);
    return () => mediaQuery.removeEventListener("change", sync);
  }, [useMaterialCards]);

  useEffect(() => {
    if (!optionGroups.length || useMaterialCards) {
      return;
    }

    const selectedImageUrl =
      optionSelections
        .flatMap((selection) => {
          const group = optionGroups.find((candidate) => candidate.id === selection.groupId);
          return selection.valueIds
            .map((valueId) => group?.values.find((value) => value.id === valueId)?.imageUrl)
            .filter((imageUrl): imageUrl is string => Boolean(imageUrl));
        })[0] ?? null;

    window.dispatchEvent(
      new CustomEvent("vemidi:product-option-image", {
        detail: { productId: product.id, imageUrl: selectedImageUrl },
      }),
    );
  }, [optionGroups, optionSelections, product.id, useMaterialCards]);

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

  const buildCurrentVariantSummary = (
    colors: SelectedProductColor[],
    options: ProductOptionSelection[],
  ) => {
    const rows: string[] = [];

    options.forEach((selection) => {
      const group = optionGroups.find((candidate) => candidate.id === selection.groupId);
      if (!group) {
        return;
      }

      const valueLabels = selection.valueIds
        .map((valueId) => group.values.find((value) => value.id === valueId)?.label)
        .filter((label): label is string => Boolean(label));
      const textValue = selection.textValue?.trim();
      const value = valueLabels.length ? valueLabels.join(", ") : textValue;
      if (value) {
        rows.push(`${group.name}: ${value}`);
      }
    });

    const colorsByField = new Map<string, string[]>();
    colors.forEach((color) => {
      const labels = colorsByField.get(color.fieldLabel) ?? [];
      labels.push(formatSelectedColorQuantityLabel(color));
      colorsByField.set(color.fieldLabel, labels);
    });
    colorsByField.forEach((labels, fieldLabel) => {
      rows.push(`${fieldLabel}: ${labels.join(", ")}`);
    });

    return rows.length ? rows : ["Основен вариант"];
  };

  const handlePrepareVariant = () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (stockSelectionBlocked) {
      setError("Всички налични бройки вече са добавени към избраните варианти или количката.");
      return;
    }

    const colors = filterSelectedColorsForOrder(flattenSelectedColors());
    const options = optionSelections.map((selection) => ({
      ...selection,
      valueIds: [...selection.valueIds],
    }));
    const variant: PreparedProductVariant = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      quantity: selectedQuantity,
      unitPrice: displayedUnitPrice,
      optionDelta,
      personalizationDelta,
      personalization: personalization || undefined,
      selectedColors: colors.length ? colors : undefined,
      personalizationFields: personalizationFields.length
        ? personalizationFields.map((field) => ({ ...field }))
        : undefined,
      optionSelections: options.length ? options : undefined,
      summary: buildCurrentVariantSummary(colors, options),
    };

    setPreparedVariants((current) => [...current, variant]);
    setQuantity(1);
    setError(null);
  };

  const removePreparedVariant = (variantId: string) => {
    setPreparedVariants((current) =>
      current.filter((variant) => variant.id !== variantId),
    );
  };

  const commitQuantityInput = (rawValue: string) => {
    const trimmed = rawValue.trim();
    if (!trimmed) {
      setQuantityInput(String(quantity));
      return;
    }

    const nextQuantity = clampProductQuantity(Number(trimmed), maxSelectableQuantity);
    setQuantity(nextQuantity);
  };

  const renderColorFields = (placement: ColorFieldsPlacement) => (
    <ProductDetailColorFields
      colorFields={colorFields}
      selectedByGroup={selectedByGroup}
      onSelectedByGroupChange={setSelectedByGroup}
      quantitiesByField={quantitiesByField}
      onQuantitiesByFieldChange={setQuantitiesByField}
      expandedColorFields={expandedColorFields}
      onExpandedColorFieldsChange={setExpandedColorFields}
      embedded={embedded}
      variant={placement === "desktop-sidebar" ? "sidebar" : "default"}
      onColorSelectionChange={() => setError(null)}
      onQuantityReset={() => {
        if (showQuantitySelector) {
          setQuantity(1);
        }
      }}
    />
  );

  const handleAddToCart = () => {
    if (usePreparedVariants) {
      if (preparedVariants.length === 0) {
        setError("Добавете поне един вариант към списъка.");
        return;
      }

      preparedVariants.forEach((variant) => {
        addProduct(
          product,
          variant.quantity,
          variant.personalization,
          variant.selectedColors,
          variant.personalizationFields,
          attribution,
          variant.optionSelections,
          { unitPrice: variant.unitPrice },
        );
      });
      setPreparedVariants([]);
      setError(null);
      setAdded(true);
      setTimeout(() => setAdded(false), 2200);
      return;
    }

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (stockSelectionBlocked) {
      setError("Вече сте добавили всички налични бройки от този продукт в количката.");
      return;
    }

    addProduct(
      product,
      selectedQuantity,
      personalization || undefined,
      filterSelectedColorsForOrder(flattenSelectedColors()) || undefined,
      personalizationFields,
      attribution,
      optionSelections.length ? optionSelections : undefined,
      { unitPrice: displayedUnitPrice },
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
              maxQuantityPerSource: offer.maxQuantity,
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

  const mobileColorFieldsSection = colorFields.length ? (
    <div className="order-15 lg:hidden">
      {renderColorFields("inline")}
    </div>
  ) : null;
  const desktopInlineColorFieldsSection = colorFields.length && !useMaterialCards ? (
    <div className="order-40 hidden lg:block">{renderColorFields("inline")}</div>
  ) : null;
  const desktopSidebarColorFieldsSection = colorFields.length && useMaterialCards
    ? renderColorFields("desktop-sidebar")
    : null;
  const stickyActionLabel = usePreparedVariants
    ? preparedQuantityTotal > 0
      ? `Добави ${preparedQuantityTotal} бр. в количката`
      : "Добави избора"
    : "Добави в количката";
  const stickyActionHandler = usePreparedVariants
    ? preparedQuantityTotal > 0
      ? handleAddToCart
      : handlePrepareVariant
    : handleAddToCart;
  const stickyActionDisabled = usePreparedVariants
    ? preparedQuantityTotal > 0
      ? !canSubmitAddToCart
      : stockSelectionBlocked
    : stockSelectionBlocked;

  return (
    <>
    <div
      id="product-configurator"
      ref={configuratorRef}
      className={
        embedded
          ? "scroll-mt-28 mt-6 w-full pb-24 lg:pb-0"
          : "scroll-mt-28 rounded-2xl border border-boutique-line bg-boutique-paper p-4 pb-24 transition-shadow duration-300 ease-out hover:shadow-boutique-sm motion-reduce:transition-none sm:p-5 lg:pb-5"
      }
    >
      <div className="flex flex-col">
      {mobileColorFieldsSection}
      {optionGroups.length ? (
        <div className={useMaterialCards ? "order-20" : "order-20"}>
        <ProductOptionsSelector
          basePrice={product.price + personalizationDelta}
          variantDisplayBasePrice={product.price}
          groups={optionGroups}
          value={optionSelections}
          onChange={handleOptionSelectionsChange}
          onEstimatedPriceChange={setEstimatedUnitPrice}
          priceSummaryLabel={priceSummaryLabel}
          priceSummaryNote={priceSummaryNote}
          useMaterialCards={useMaterialCards}
        />
        </div>
      ) : null}

      {!optionGroups.length && personalizationDelta > 0 ? (
        <p className={`mt-5 text-sm text-boutique-muted ${useMaterialCards ? "order-25" : "order-25"}`}>
          {priceSummaryLabel}:{" "}
          <strong className="text-boutique-ink">
            {(product.price + personalizationDelta).toFixed(2).replace(".", ",")} €
          </strong>
        </p>
      ) : null}

      {showQuantityPriceTiers ? (
        <section
          className={`mt-3 rounded-xl border border-boutique-line bg-white/70 p-3 ${quantityTiersSectionOrder}`}
        >
          <h2 className="text-sm font-semibold text-boutique-ink">
            Отстъпки за количества
          </h2>
          <p className="mt-1 text-xs text-boutique-muted">
            Цените се обновяват според избрания размер, материал и персонализация.
          </p>
          <div className="mt-2 grid gap-1.5 text-sm text-boutique-muted">
            {product.quantityPriceTiers?.map((tier) => {
              const tierDisplayPrice = resolveQuantityTierDisplayUnitPrice(
                tier.unitPrice,
                optionDelta,
                personalizationDelta,
              );

              return (
                <div
                  key={`${tier.minQuantity}-${tier.maxQuantity ?? "plus"}`}
                  className="flex items-center justify-between gap-4 rounded-lg bg-boutique-bg px-3 py-1.5"
                >
                  <span>
                    {tier.maxQuantity === null
                      ? `от ${tier.minQuantity} бр.`
                      : `${tier.minQuantity}-${tier.maxQuantity} бр.`}
                  </span>
                  <strong className="text-boutique-ink">
                    {formatEur(tierDisplayPrice)} / бр.
                  </strong>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {desktopInlineColorFieldsSection}

      {fields.length ? (
        <details
          className={`rounded-2xl border border-boutique-line bg-white/70 p-3 ${personalizationSectionOrder}`}
          open={
            personalizationDetailsOpen ??
            fields.some((field) => field.required)
          }
        >
          <summary className="cursor-pointer list-none text-sm font-semibold text-boutique-ink marker:hidden">
            Персонализация
            <span className="ml-2 text-xs font-normal text-boutique-muted">
              Добавете личен текст, име или друга информация според продукта
            </span>
          </summary>
          <div className="mt-3 grid gap-3">
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
              Прегледайте и редактирайте избраното пожелание спрямо получателя - име, пол,
              възраст и конкретен повод.
            </p>
          ) : null}
          </div>
        </details>
      ) : null}

      {error ? (
        <p className={`mt-5 text-sm font-medium text-red-700 ${useMaterialCards ? "order-50" : "order-50"}`}>
          {error}
        </p>
      ) : null}
      {showQuantitySelector ? (
      <div className={`mt-3 rounded-xl border border-boutique-line bg-white/70 p-3 ${quantitySelectorOrder}`}>
        <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center">
          <div className="sm:col-span-2">
            <p className="text-sm font-semibold text-boutique-ink">Количество</p>
            {remainingStockForSelection !== null ? (
              <p className="mt-1 text-xs text-boutique-muted">
                Налични за добавяне: {remainingStockForSelection} бр.
              </p>
            ) : (
              <p className="mt-1 text-xs text-boutique-muted">
                За продукти по поръчка максимумът е 99 бр.
              </p>
            )}
          </div>
          <div className="inline-flex w-fit items-center rounded-xl border border-boutique-line bg-boutique-paper">
            <button
              type="button"
              aria-label="Намалете количеството"
              disabled={quantity <= 1 || stockSelectionBlocked}
              onClick={() =>
                setQuantity((current) =>
                  clampProductQuantity(current - 1, maxSelectableQuantity),
                )
              }
              className="grid h-11 w-11 place-items-center text-xl text-boutique-muted transition hover:text-boutique-ink disabled:opacity-40"
            >
              −
            </button>
            <input
              type="number"
              min={1}
              max={maxSelectableQuantity}
              disabled={stockSelectionBlocked}
                value={quantityInput}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setQuantityInput(nextValue);

                  if (!nextValue.trim()) {
                    return;
                  }

                  const nextQuantity = Number(nextValue);
                  if (!Number.isFinite(nextQuantity)) {
                    return;
                  }

                  setQuantity(
                    clampProductQuantity(nextQuantity, maxSelectableQuantity),
                  );
                }}
                onBlur={(event) => commitQuantityInput(event.target.value)}
              className="h-11 w-16 border-x border-boutique-line bg-transparent text-center text-sm font-semibold text-boutique-ink outline-none disabled:opacity-50"
            />
            <button
              type="button"
              aria-label="Увеличете количеството"
              disabled={quantity >= maxSelectableQuantity || stockSelectionBlocked}
              onClick={() =>
                setQuantity((current) =>
                  clampProductQuantity(current + 1, maxSelectableQuantity),
                )
              }
              className="grid h-11 w-11 place-items-center text-xl text-boutique-muted transition hover:text-boutique-ink disabled:opacity-40"
            >
              +
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <strong className="text-boutique-ink">
              {formatEur(displayedUnitPrice)} / бр.
            </strong>
            {quantityDiscountPerItem > 0 ? (
              <span className="rounded-full bg-boutique-sage/10 px-3 py-1 text-xs font-semibold text-boutique-sage-deep">
                -{formatEur(quantityDiscountPerItem)} отстъпка
              </span>
            ) : null}
          </div>
        </div>
        {selectedQuantity > 1 ? (
          <p className="mt-3 text-sm text-boutique-muted">
            Общо за {selectedQuantity} бр.:{" "}
            <strong className="text-boutique-ink">{formatEur(displayedLinePrice)}</strong>
          </p>
        ) : null}
        {stockSelectionBlocked ? (
          <p className="mt-3 text-sm font-medium text-red-700">
            Всички налични бройки вече са добавени към избраните варианти или количката.
          </p>
        ) : null}
      </div>
      ) : null}
      {usePreparedVariants ? (
        <div className={useMaterialCards ? "order-70" : "order-70"}>
          <button
            type="button"
            disabled={!canPrepareVariant}
            onClick={handlePrepareVariant}
            className="mt-5 w-full rounded-xl bg-boutique-ink px-8 py-3.5 text-sm font-semibold text-white transition duration-200 ease-out hover:-translate-y-1 hover:bg-boutique-sage-deep hover:shadow-[0_16px_32px_-12px_rgb(44_40_37_/0.22)] active:translate-y-0 active:shadow-sm disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            Добави избора
          </button>

          <section className="mt-4 rounded-2xl border border-boutique-line bg-boutique-bg/60 p-4">
            <div>
              <h2 className="text-sm font-semibold text-boutique-ink">
                Избрани варианти
              </h2>
              <p className="mt-1 text-xs leading-5 text-boutique-muted">
                Добавете отделен ред за всяка комбинация от размер, материал, цвят и количество.
              </p>
            </div>

            {preparedVariants.length ? (
              <div className="mt-4 space-y-3">
                {preparedVariants.map((variant, index) => (
                  <article
                    key={variant.id}
                    className="rounded-xl border border-boutique-line bg-white px-3 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-boutique-ink">
                          Вариант {index + 1} · {variant.quantity} бр. ·{" "}
                          {formatEur(getPreparedVariantUnitPrice(variant, index) * variant.quantity)}
                        </p>
                        <div className="mt-1 space-y-0.5 text-xs leading-5 text-boutique-muted">
                          {variant.summary.map((row) => (
                            <p key={`${variant.id}-${row}`}>{row}</p>
                          ))}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removePreparedVariant(variant.id)}
                        className="shrink-0 text-xs font-semibold text-boutique-accent underline-offset-4 hover:text-boutique-ink hover:underline"
                      >
                        Премахни
                      </button>
                    </div>
                  </article>
                ))}
                <p className="text-sm font-semibold text-boutique-ink">
                  Общо избрани: {preparedQuantityTotal} бр. ·{" "}
                  {formatEur(preparedVariantsTotalPrice)}
                </p>
              </div>
            ) : (
              <p className="mt-4 rounded-xl border border-dashed border-boutique-line bg-white/70 px-3 py-3 text-sm text-boutique-muted">
                Все още няма добавени варианти.
              </p>
            )}
          </section>
        </div>
      ) : null}
      {!showQuantitySelector && stockSelectionBlocked ? (
        <p className={`mt-4 text-sm font-medium text-red-700 ${useMaterialCards ? "order-75" : "order-75"}`}>
          Всички налични бройки вече са в количката.
        </p>
      ) : null}
      <button
        type="button"
        aria-live="polite"
        disabled={!canSubmitAddToCart}
        onClick={handleAddToCart}
        className={`mt-5 w-full rounded-xl px-8 py-3.5 text-sm font-semibold text-white transition duration-200 ease-out hover:-translate-y-1 hover:shadow-[0_16px_32px_-12px_rgb(44_40_37_/0.22)] active:translate-y-0 active:shadow-sm disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${useMaterialCards ? "order-80" : "order-80"} ${
          added
            ? "bg-boutique-sage shadow-boutique-sm"
            : "bg-boutique-sage-deep hover:bg-boutique-ink"
        }`}
      >
        {added
          ? "✓ Добавено в количката"
          : usePreparedVariants
            ? preparedQuantityTotal > 0
              ? `Добави ${preparedQuantityTotal} бр. в количката`
              : "Добави в количката"
            : "Добавете в количката"}
      </button>

      {upsellOffers.length ? (
        <section
          aria-labelledby="product-upsell-title"
          className={`mt-4 rounded-2xl border border-boutique-line bg-boutique-bg/60 p-4 ${useMaterialCards ? "order-90" : "order-90"}`}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-boutique-accent">
            Специална оферта
          </p>
          <h2
            id="product-upsell-title"
            className="mt-1 font-heading text-2xl text-boutique-ink"
          >
            {upsellSectionTitle?.trim() || "Добавете към подаръка"}
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
                    aria-label={`Р”РѕР±Р°РІРµС‚Рµ ${offer.product.title}`}
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
    </div>
      {useMaterialCards && desktopColorPortalActive && leftColorsSlot && desktopSidebarColorFieldsSection
      ? createPortal(desktopSidebarColorFieldsSection, leftColorsSlot)
      : null}
    {showMobileBar ? (
      <div
        className="fixed inset-x-0 bottom-0 z-50 border-t border-boutique-line bg-boutique-paper/95 px-4 py-3 shadow-[0_-10px_30px_-20px_rgb(44_40_37_/0.45)] backdrop-blur lg:hidden"
        aria-label="Бързо добавяне в количката"
      >
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-boutique-muted">
              {priceSummaryLabel}
            </p>
            <p className="font-heading text-xl text-boutique-ink">
              {usePreparedVariants
                ? preparedQuantityTotal > 0
                  ? formatEur(preparedVariantsTotalPrice)
                  : selectedQuantity > 1
                    ? formatEur(displayedLinePrice)
                    : formatEur(displayedUnitPrice)
                : selectedQuantity > 1
                  ? formatEur(displayedLinePrice)
                  : formatEur(displayedUnitPrice)}
            </p>
          </div>
          <button
            type="button"
            disabled={stickyActionDisabled}
            onClick={stickyActionHandler}
            className={`min-h-12 shrink-0 rounded-xl px-5 text-sm font-semibold text-white transition duration-200 ease-out hover:-translate-y-1 hover:shadow-[0_14px_28px_-10px_rgb(44_40_37_/0.2)] active:translate-y-0 active:shadow-sm disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${
              added
                ? "bg-boutique-sage shadow-boutique-sm"
                : "bg-boutique-sage-deep hover:bg-boutique-ink"
            }`}
          >
            {added ? "✓ Добавено" : stickyActionLabel}
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
