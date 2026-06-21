import type { CartLine } from "@/lib/cart-types";
import type { ProductOptionSelection } from "@/lib/product-options";
import type { SelectedProductColor } from "@/lib/product-colors";
import type {
  ProductPersonalizationField,
  ProductPersonalizationValue,
} from "@/lib/product-personalization";

export const PRODUCT_CONFIGURATION_DRAFT_PREFIX =
  "vemidi:product-configuration-v1";

export type ProductConfigurationDraft = {
  values: Record<string, string>;
  enabledOptionalFieldIds: string[];
  selectedColorOptionIdsByFieldId: Record<string, string[]>;
  optionSelections: ProductOptionSelection[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseStringRecord(value: unknown): Record<string, string> {
  if (!isRecord(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(
        (entry): entry is [string, string] =>
          Boolean(entry[0]) && typeof entry[1] === "string",
      )
      .slice(0, 20)
      .map(([key, entry]) => [key.slice(0, 100), entry.slice(0, 1000)]),
  );
}

function parseStringArray(value: unknown, limit = 20): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is string => typeof entry === "string" && Boolean(entry))
    .slice(0, limit)
    .map((entry) => entry.slice(0, 100));
}

function parseSelectedColors(value: unknown): Record<string, string[]> {
  if (!isRecord(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .slice(0, 20)
      .map(([fieldId, optionIds]) => [fieldId.slice(0, 100), parseStringArray(optionIds)]),
  );
}

function parseOptionSelections(value: unknown): ProductOptionSelection[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .slice(0, 20)
    .map((entry): ProductOptionSelection | null => {
      if (!isRecord(entry) || typeof entry.groupId !== "string" || !entry.groupId) {
        return null;
      }

      const textValue =
        typeof entry.textValue === "string"
          ? entry.textValue.slice(0, 1000)
          : undefined;

      return {
        groupId: entry.groupId.slice(0, 100),
        valueIds: parseStringArray(entry.valueIds),
        ...(textValue !== undefined ? { textValue } : {}),
      };
    })
    .filter((entry): entry is ProductOptionSelection => entry !== null);
}

export function getProductConfigurationDraftKey(productId: string) {
  return `${PRODUCT_CONFIGURATION_DRAFT_PREFIX}:${productId}`;
}

export function parseProductConfigurationDraft(
  raw: string | null,
): ProductConfigurationDraft | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) {
      return null;
    }

    return {
      values: parseStringRecord(parsed.values),
      enabledOptionalFieldIds: parseStringArray(parsed.enabledOptionalFieldIds),
      selectedColorOptionIdsByFieldId: parseSelectedColors(
        parsed.selectedColorOptionIdsByFieldId,
      ),
      optionSelections: parseOptionSelections(parsed.optionSelections),
    };
  } catch {
    return null;
  }
}

export function mergeProductOptionSelections(
  stored: ProductOptionSelection[],
  incoming: ProductOptionSelection[],
) {
  const merged = new Map(stored.map((selection) => [selection.groupId, selection]));
  for (const selection of incoming) {
    merged.set(selection.groupId, selection);
  }
  return [...merged.values()];
}

export type ProductConfigurationDraftIncoming = {
  optionSelections?: ProductOptionSelection[];
  personalizationFields?: ProductPersonalizationValue[];
  selectedColors?: SelectedProductColor[];
};

export function findCartLineForProduct(
  lines: readonly Pick<CartLine, "productId">[],
  productId: string,
): Pick<
  CartLine,
  "personalization" | "personalizationFields" | "selectedColors" | "optionSelections"
> | null {
  const matches = lines.filter((line) => line.productId === productId);
  if (matches.length === 0) {
    return null;
  }

  return matches.reduce<
    Pick<
      CartLine,
      "personalization" | "personalizationFields" | "selectedColors" | "optionSelections"
    > | null
  >((best, line) => {
    const candidate = line as Pick<
      CartLine,
      "personalization" | "personalizationFields" | "selectedColors" | "optionSelections"
    >;
    if (!best) {
      return candidate;
    }

    const candidateScore =
      (candidate.personalizationFields?.length ?? 0) +
      (candidate.personalization?.trim() ? 1 : 0) +
      (candidate.optionSelections?.length ?? 0) +
      (candidate.selectedColors?.length ?? 0);
    const bestScore =
      (best.personalizationFields?.length ?? 0) +
      (best.personalization?.trim() ? 1 : 0) +
      (best.optionSelections?.length ?? 0) +
      (best.selectedColors?.length ?? 0);

    return candidateScore >= bestScore ? candidate : best;
  }, null);
}

export function buildConfigurationIncomingFromCartLine(
  line: Pick<
    CartLine,
    "personalization" | "personalizationFields" | "selectedColors" | "optionSelections"
  >,
  fields: readonly ProductPersonalizationField[] = [],
): ProductConfigurationDraftIncoming {
  let personalizationFields = line.personalizationFields?.length
    ? line.personalizationFields
    : undefined;

  if (!personalizationFields?.length && line.personalization?.trim() && fields.length > 0) {
    const targetField =
      fields.find((field) => field.key === "name")
      ?? fields.find((field) => field.key === "personalization")
      ?? fields[0];
    if (targetField) {
      personalizationFields = [{
        fieldId: targetField.id,
        fieldKey: targetField.key,
        label: targetField.label,
        value: line.personalization.trim(),
      }];
    }
  }

  return {
    personalizationFields,
    selectedColors: line.selectedColors?.length ? line.selectedColors : undefined,
    optionSelections: line.optionSelections?.length ? line.optionSelections : undefined,
  };
}

export function resolveProductConfigurationDraft(
  storedDraft: ProductConfigurationDraft | null,
  cartLine: Pick<
    CartLine,
    "personalization" | "personalizationFields" | "selectedColors" | "optionSelections"
  > | null,
  fields: readonly ProductPersonalizationField[] = [],
): ProductConfigurationDraft | null {
  const base = storedDraft ?? {
    values: {},
    enabledOptionalFieldIds: [],
    selectedColorOptionIdsByFieldId: {},
    optionSelections: [],
  };

  if (!cartLine) {
    return storedDraft;
  }

  return mergeProductConfigurationDraft(
    base,
    buildConfigurationIncomingFromCartLine(cartLine, fields),
  );
}

export function mergeProductConfigurationDraft(
  base: ProductConfigurationDraft,
  incoming: ProductConfigurationDraftIncoming,
): ProductConfigurationDraft {
  const values = { ...base.values };
  const enabledOptionalFieldIds = new Set(base.enabledOptionalFieldIds);
  const selectedColorOptionIdsByFieldId = {
    ...base.selectedColorOptionIdsByFieldId,
  };

  for (const field of incoming.personalizationFields ?? []) {
    values[field.fieldId] = field.value;
    enabledOptionalFieldIds.add(field.fieldId);
  }
  for (const color of incoming.selectedColors ?? []) {
    selectedColorOptionIdsByFieldId[color.fieldId] = [color.optionId];
  }

  return {
    values,
    enabledOptionalFieldIds: [...enabledOptionalFieldIds],
    selectedColorOptionIdsByFieldId,
    optionSelections: mergeProductOptionSelections(
      base.optionSelections,
      incoming.optionSelections ?? [],
    ),
  };
}
