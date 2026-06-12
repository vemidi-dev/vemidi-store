import type {
  ProductOptionGroup,
  ProductOptionSelection,
} from "@/lib/product-options";
import {
  getVisibleOptionGroups,
  isChoiceOptionGroup,
  isTextOptionGroup,
} from "@/lib/product-options";
import { calculateOptionDelta } from "@/lib/product-option-pricing";

export type OptionValidationErrorCode =
  | "invalid_option_selections"
  | "invalid_option_group"
  | "duplicate_option_group"
  | "duplicate_option_value"
  | "invalid_option_value"
  | "invalid_option_count"
  | "required_option_missing"
  | "option_dependency_not_met"
  | "option_value_sold_out"
  | "option_text_too_long"
  | "invalid_option_date";

export type OptionValidationResult =
  | {
      ok: true;
      optionDelta: number;
      selections: ProductOptionSelection[];
    }
  | {
      ok: false;
      code: OptionValidationErrorCode;
      message: string;
    };

const errorMessages: Record<OptionValidationErrorCode, string> = {
  invalid_option_selections: "Изборът на опции е невалиден.",
  invalid_option_group: "Подадена е непозволена група опции.",
  duplicate_option_group: "Дублирана група опции.",
  duplicate_option_value: "Една и съща стойност на опция е подадена повече от веднъж.",
  invalid_option_value: "Подадена е непозволена стойност.",
  invalid_option_count: "Броят избрани опции не е валиден.",
  required_option_missing: "Попълнете всички задължителни опции.",
  option_dependency_not_met: "Условната опция не е достъпна.",
  option_value_sold_out: "Избраната опция е изчерпана.",
  option_text_too_long: "Текстът в опцията е твърде дълъг.",
  invalid_option_date: "Въведете валидна дата.",
};

function fail(code: OptionValidationErrorCode): OptionValidationResult {
  return { ok: false, code, message: errorMessages[code] };
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validateProductOptionSelections(
  productId: string,
  groups: ProductOptionGroup[],
  rawSelections: unknown,
  options?: { productIds?: Map<string, string> },
): OptionValidationResult {
  if (rawSelections == null) {
    rawSelections = [];
  }

  if (!Array.isArray(rawSelections)) {
    return fail("invalid_option_selections");
  }

  const activeGroups = groups.filter((group) => group.isActive);
  const groupsById = new Map(activeGroups.map((group) => [group.id, group]));
  const seenGroupIds = new Set<string>();
  const normalized: ProductOptionSelection[] = [];

  for (const raw of rawSelections) {
    if (!raw || typeof raw !== "object") {
      return fail("invalid_option_selections");
    }

    const entry = raw as Record<string, unknown>;
    const groupId = typeof entry.groupId === "string" ? entry.groupId.trim() : "";
    if (!groupId) {
      return fail("invalid_option_group");
    }

    if (seenGroupIds.has(groupId)) {
      return fail("duplicate_option_group");
    }
    seenGroupIds.add(groupId);

    const group = groupsById.get(groupId);
    if (!group) {
      return fail("invalid_option_group");
    }

    if (options?.productIds && options.productIds.get(groupId) !== productId) {
      return fail("invalid_option_group");
    }

    const valueIds = Array.isArray(entry.valueIds)
      ? entry.valueIds
          .filter((value): value is string => typeof value === "string")
          .map((value) => value.trim())
          .filter(Boolean)
      : [];
    const uniqueValueIds = [...new Set(valueIds)];
    if (uniqueValueIds.length !== valueIds.length) {
      return fail("duplicate_option_value");
    }
    const textValue =
      typeof entry.textValue === "string" ? entry.textValue.trim() : "";

    if (isChoiceOptionGroup(group)) {
      if (textValue) {
        return fail("invalid_option_value");
      }

      if (
        uniqueValueIds.length < group.minSelect ||
        uniqueValueIds.length > group.maxSelect
      ) {
        return fail("invalid_option_count");
      }

      if (group.isRequired && uniqueValueIds.length === 0) {
        return fail("required_option_missing");
      }

      const valuesById = new Map(group.values.map((value) => [value.id, value]));
      for (const valueId of uniqueValueIds) {
        const value = valuesById.get(valueId);
        if (!value || !value.isActive) {
          return fail("invalid_option_value");
        }
        if (value.isSoldOut) {
          return fail("option_value_sold_out");
        }
      }

      if (uniqueValueIds.length > 0) {
        normalized.push({ groupId, valueIds: uniqueValueIds });
      }
      continue;
    }

    if (isTextOptionGroup(group)) {
      if (uniqueValueIds.length > 0) {
        return fail("invalid_option_value");
      }

      if (group.isRequired && !textValue) {
        return fail("required_option_missing");
      }

      if (textValue) {
        const maxLength = group.maxLength ?? 1000;
        if (textValue.length > maxLength) {
          return fail("option_text_too_long");
        }
        if (group.inputType === "date" && !isValidDate(textValue)) {
          return fail("invalid_option_date");
        }
        normalized.push({ groupId, valueIds: [], textValue });
      }
    }
  }

  const selectedValueIds = new Set(
    normalized.flatMap((selection) => selection.valueIds),
  );
  const visibleGroups = getVisibleOptionGroups(activeGroups, normalized);

  for (const group of visibleGroups) {
    if (!group.isRequired) {
      continue;
    }
    const hasSelection = normalized.some((selection) => selection.groupId === group.id);
    if (!hasSelection) {
      return fail("required_option_missing");
    }
  }

  for (const selection of normalized) {
    const group = groupsById.get(selection.groupId);
    if (!group?.dependsOnOptionId) {
      continue;
    }
    if (!selectedValueIds.has(group.dependsOnOptionId)) {
      return fail("option_dependency_not_met");
    }
  }

  const optionDelta = calculateOptionDelta(activeGroups, normalized);
  return { ok: true, optionDelta, selections: normalized };
}

export function sanitizeOptionSelectionsInput(raw: unknown): ProductOptionSelection[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.flatMap((entry) => {
    if (!entry || typeof entry !== "object") {
      return [];
    }
    const value = entry as Record<string, unknown>;
    const groupId = typeof value.groupId === "string" ? value.groupId.trim() : "";
    if (!groupId) {
      return [];
    }
    const valueIds = Array.isArray(value.valueIds)
      ? [...new Set(
          value.valueIds
            .filter((id): id is string => typeof id === "string")
            .map((id) => id.trim())
            .filter(Boolean),
        )]
      : [];
    const textValue =
      typeof value.textValue === "string" ? value.textValue.trim().slice(0, 1000) : undefined;
    return [{ groupId, valueIds, textValue: textValue || undefined }];
  });
}
