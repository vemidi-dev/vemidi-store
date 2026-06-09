import type { ProductPersonalizationValue } from "@/lib/product-personalization";

export type PersonalizationFieldDefinition = {
  id: string;
  product_id: string;
  label: string;
  field_key: string;
  field_type: "text" | "textarea" | "date";
  max_length: number;
  is_required: boolean;
};

export type PersonalizationValidationResult =
  | {
      ok: true;
      fields: ProductPersonalizationValue[];
      summary: string | null;
    }
  | {
      ok: false;
      code:
        | "invalid_personalization_fields"
        | "required_personalization_missing"
        | "personalization_too_long"
        | "invalid_personalization_date";
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validatePersonalizationFields(
  submitted: unknown,
  definitions: PersonalizationFieldDefinition[],
): PersonalizationValidationResult {
  if (!Array.isArray(submitted)) {
    if (definitions.some((field) => field.is_required)) {
      return { ok: false, code: "required_personalization_missing" };
    }
    return { ok: true, fields: [], summary: null };
  }

  if (submitted.length > 20) {
    return { ok: false, code: "invalid_personalization_fields" };
  }

  const definitionsById = new Map(definitions.map((field) => [field.id, field]));
  const seen = new Set<string>();
  const fields: ProductPersonalizationValue[] = [];

  for (const value of submitted) {
    if (!isRecord(value) || typeof value.fieldId !== "string") {
      return { ok: false, code: "invalid_personalization_fields" };
    }

    const definition = definitionsById.get(value.fieldId);
    if (!definition || seen.has(definition.id) || typeof value.value !== "string") {
      return { ok: false, code: "invalid_personalization_fields" };
    }

    seen.add(definition.id);
    const normalizedValue = value.value.trim();
    if (!normalizedValue) {
      continue;
    }
    if (normalizedValue.length > definition.max_length) {
      return { ok: false, code: "personalization_too_long" };
    }
    if (definition.field_type === "date" && !isIsoDate(normalizedValue)) {
      return { ok: false, code: "invalid_personalization_date" };
    }

    fields.push({
      fieldId: definition.id,
      fieldKey: definition.field_key,
      label: definition.label,
      value: normalizedValue,
    });
  }

  if (
    definitions.some(
      (definition) =>
        definition.is_required &&
        !fields.some((field) => field.fieldId === definition.id),
    )
  ) {
    return { ok: false, code: "required_personalization_missing" };
  }

  return {
    ok: true,
    fields,
    summary:
      fields.length > 0
        ? fields.map((field) => `${field.label}: ${field.value}`).join("\n")
        : null,
  };
}
