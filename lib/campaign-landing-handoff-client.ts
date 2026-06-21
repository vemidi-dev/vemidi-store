import { BUTTERFLY_LEGACY_PERSONALIZATION_FIELD_KEY } from "@/lib/campaign-handoff-post";
import type { Product } from "@/lib/catalog";
import type { ProductConfigurationDraft } from "@/lib/product-configuration-draft";
import type { ProductOptionGroup } from "@/lib/product-options";
import { validateLandingSlug } from "@/lib/product-landing/validation";

export const CROSS_HANDOFF_PERSONALIZATION_POST_KEY = `pf_${BUTTERFLY_LEGACY_PERSONALIZATION_FIELD_KEY}`;

export function sanitizeCrossHandoffPersonalization(value: string) {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, 50);
}

function findValueKey(
  groups: ProductOptionGroup[],
  groupId: string,
  valueId: string,
): string | null {
  const group = groups.find((candidate) => candidate.id === groupId);
  if (!group) {
    return null;
  }

  const value = group.values.find((candidate) => candidate.id === valueId);
  return value?.key ?? null;
}

export function buildLandingHandoffPostFieldsFromDraft(
  product: Product,
  landingSlug: string,
  draft: ProductConfigurationDraft,
):
  | { ok: true; fields: Record<string, string> }
  | { ok: false; error: string } {
  const slugValidation = validateLandingSlug(landingSlug);
  if (!slugValidation.ok) {
    return { ok: false, error: "Landing страницата не е налична." };
  }

  const groups = product.optionGroups ?? [];
  const crossFields: Record<string, string> = {};

  for (const selection of draft.optionSelections) {
    if (selection.valueIds.length !== 1) {
      continue;
    }

    const group = groups.find((candidate) => candidate.id === selection.groupId);
    if (!group) {
      continue;
    }

    const valueKey = findValueKey(groups, selection.groupId, selection.valueIds[0] ?? "");
    if (!valueKey) {
      continue;
    }

    crossFields[`option_${group.key}`] = valueKey;
  }

  if (!crossFields.option_razmer_na_komplekta) {
    return { ok: false, error: "Моля, изберете размер на комплекта." };
  }

  if (!crossFields.option_coloring) {
    return { ok: false, error: "Моля, изберете оцветяване." };
  }

  for (const field of product.personalizationFields ?? []) {
    if (!draft.enabledOptionalFieldIds.includes(field.id)) {
      continue;
    }

    const rawValue = draft.values[field.id]?.trim() ?? "";
    if (!rawValue) {
      continue;
    }

    if (field.key === BUTTERFLY_LEGACY_PERSONALIZATION_FIELD_KEY) {
      const sanitized = sanitizeCrossHandoffPersonalization(rawValue);
      if (sanitized) {
        crossFields[CROSS_HANDOFF_PERSONALIZATION_POST_KEY] = sanitized;
      }
    }
  }

  return {
    ok: true,
    fields: {
      product: product.id,
      landingSlug: slugValidation.slug,
      ...crossFields,
    },
  };
}
