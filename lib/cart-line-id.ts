import type { ProductOptionSelection } from "@/lib/product-options";
import type { SelectedProductColor } from "@/lib/product-colors";
import type { ProductPersonalizationValue } from "@/lib/product-personalization";

export type CartLineIdContext = {
  upsellOfferId?: string;
  upsellSourceProductId?: string;
};

function serializeOptionSelections(optionSelections?: ProductOptionSelection[]) {
  if (!optionSelections?.length) {
    return "";
  }

  return [...optionSelections]
    .sort((a, b) => a.groupId.localeCompare(b.groupId))
    .map((selection) => {
      const values = [...selection.valueIds].sort().join(",");
      const text = selection.textValue?.trim() ?? "";
      return `${selection.groupId}:${values}:${text}`;
    })
    .join("|");
}

function serializeColors(selectedColors?: SelectedProductColor[]) {
  if (!selectedColors || selectedColors.length === 0) {
    return "";
  }

  return [...selectedColors]
    .sort((a, b) => {
      const fieldCmp = a.fieldId.localeCompare(b.fieldId);
      if (fieldCmp !== 0) {
        return fieldCmp;
      }
      return a.optionId.localeCompare(b.optionId);
    })
    .map((item) => {
      if (item.quantity !== undefined) {
        return `${item.fieldId}:${item.optionId}:${item.quantity}`;
      }

      return `${item.fieldId}:${item.optionId}`;
    })
    .join("|");
}

function serializePersonalizationFields(
  personalizationFields?: ProductPersonalizationValue[],
) {
  if (!personalizationFields?.length) {
    return "";
  }

  return [...personalizationFields]
    .sort((a, b) => a.fieldId.localeCompare(b.fieldId))
    .map((item) => `${item.fieldId}:${item.value.trim()}`)
    .join("|");
}

/** Stable id for merging cart lines (same product + same options). */
export function makeCartLineId(
  productId: string,
  personalization?: string,
  selectedColors?: SelectedProductColor[],
  personalizationFields?: ProductPersonalizationValue[],
  optionSelections?: ProductOptionSelection[],
  context?: CartLineIdContext,
): string {
  const p =
    serializePersonalizationFields(personalizationFields) ||
    personalization?.trim() ||
    "";
  const colors = serializeColors(selectedColors);
  const options = serializeOptionSelections(optionSelections);
  const upsell =
    context?.upsellOfferId && context.upsellSourceProductId
      ? `upsell:${context.upsellSourceProductId}:${context.upsellOfferId}`
      : "";
  const base = `${productId}::${p}::${colors}::${options}`;
  return upsell ? `${base}::${upsell}` : base;
}
