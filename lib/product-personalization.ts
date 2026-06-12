import { formatPriceDelta } from "@/lib/product-option-pricing";

export type ProductPersonalizationField = {
  id: string;
  label: string;
  key: string;
  type: "text" | "textarea" | "date";
  placeholder: string | null;
  maxLength: number;
  priceDelta?: number;
  required: boolean;
  allowsWishTemplates: boolean;
};

export type ProductPersonalizationValue = {
  fieldId: string;
  fieldKey: string;
  label: string;
  value: string;
};

export type WishTemplate = {
  id: string;
  body: string;
};

export function usesPersonalizationToggle(field: ProductPersonalizationField) {
  return !field.required;
}

export function formatPersonalizationToggleLabel(field: ProductPersonalizationField) {
  const deltaLabel = formatPriceDelta(field.priceDelta ?? 0);
  return deltaLabel
    ? `Добави ${field.label} (${deltaLabel})`
    : `Добави ${field.label}`;
}

export function shouldShowPersonalizationInput(
  field: ProductPersonalizationField,
  enabledOptionalFields: ReadonlySet<string>,
) {
  return field.required || enabledOptionalFields.has(field.id);
}

export function buildPersonalizationFieldValues(
  fields: ProductPersonalizationField[],
  values: Record<string, string>,
  enabledOptionalFields: ReadonlySet<string>,
): ProductPersonalizationValue[] {
  return fields.flatMap((field) => {
    if (!field.required && !enabledOptionalFields.has(field.id)) {
      return [];
    }

    const value = (values[field.id] ?? "").trim();
    return value
      ? [{
          fieldId: field.id,
          fieldKey: field.key,
          label: field.label,
          value,
        }]
      : [];
  });
}

export function buildPersonalizationSummary(
  fields: ProductPersonalizationField[],
  values: Record<string, string>,
  enabledOptionalFields: ReadonlySet<string>,
) {
  return fields
    .flatMap((field) => {
      if (!field.required && !enabledOptionalFields.has(field.id)) {
        return [];
      }

      const value = (values[field.id] ?? "").trim();
      return value ? [`${field.label}: ${value}`] : [];
    })
    .join("\n")
    .slice(0, 1000);
}

export function enableOptionalPersonalizationField(
  enabledOptionalFields: ReadonlySet<string>,
  fieldId: string,
) {
  return new Set([...enabledOptionalFields, fieldId]);
}

export function disableOptionalPersonalizationField(
  enabledOptionalFields: ReadonlySet<string>,
  values: Record<string, string>,
  fieldId: string,
) {
  const nextEnabled = new Set(enabledOptionalFields);
  nextEnabled.delete(fieldId);
  const nextValues = { ...values };
  delete nextValues[fieldId];
  return {
    enabledOptionalFields: nextEnabled,
    values: nextValues,
  };
}

export function calculatePersonalizationDelta(
  fields: ProductPersonalizationField[] | undefined,
  values: ProductPersonalizationValue[] | undefined,
) {
  if (!fields?.length || !values?.length) {
    return 0;
  }

  const completedFieldIds = new Set(
    values.filter((value) => value.value.trim()).map((value) => value.fieldId),
  );

  return fields.reduce(
    (total, field) =>
      completedFieldIds.has(field.id)
        ? total + Math.max(0, Number(field.priceDelta) || 0)
        : total,
    0,
  );
}
