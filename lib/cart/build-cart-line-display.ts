import type { ProductOptionGroup, ProductOptionSelection } from "@/lib/product-options";
import {
  getVisibleOptionGroups,
  isChoiceOptionGroup,
  isTextOptionGroup,
} from "@/lib/product-options";

export type CartLineDisplayRow = {
  label: string;
  value: string;
};

export type CartLineDisplaySnapshot = {
  optionRows: CartLineDisplayRow[];
};

export function buildCartLineOptionDisplayRows(
  groups: ProductOptionGroup[] | undefined,
  selections: ProductOptionSelection[] | undefined,
): CartLineDisplayRow[] {
  if (!groups?.length || !selections?.length) {
    return [];
  }

  const activeGroups = groups.filter((group) => group.isActive);
  const selectionByGroupId = new Map(
    selections.map((selection) => [selection.groupId, selection]),
  );

  return getVisibleOptionGroups(activeGroups, selections).flatMap((group) => {
    const selection = selectionByGroupId.get(group.id);
    if (!selection) {
      return [];
    }

    if (isTextOptionGroup(group)) {
      const textValue = selection.textValue?.trim();
      if (!textValue) {
        return [];
      }

      return [{ label: group.name, value: textValue }];
    }

    if (isChoiceOptionGroup(group)) {
      const labels = selection.valueIds
        .map((valueId) => group.values.find((value) => value.id === valueId && value.isActive))
        .filter((value): value is NonNullable<typeof value> => Boolean(value))
        .map((value) => value.label);

      if (!labels.length) {
        return [];
      }

      return [{ label: group.name, value: labels.join(" / ") }];
    }

    return [];
  });
}

export function buildCartLineDisplaySnapshot(input: {
  optionGroups?: ProductOptionGroup[];
  optionSelections?: ProductOptionSelection[];
}): CartLineDisplaySnapshot | undefined {
  const optionRows = buildCartLineOptionDisplayRows(
    input.optionGroups,
    input.optionSelections,
  );

  if (!optionRows.length) {
    return undefined;
  }

  return { optionRows };
}

export function parseCartLineDisplaySnapshot(
  value: unknown,
): CartLineDisplaySnapshot | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.optionRows)) {
    return undefined;
  }

  const optionRows = record.optionRows.flatMap((row) => {
    if (!row || typeof row !== "object") {
      return [];
    }

    const entry = row as Record<string, unknown>;
    const label = typeof entry.label === "string" ? entry.label.trim() : "";
    const displayValue = typeof entry.value === "string" ? entry.value.trim() : "";

    if (!label || !displayValue) {
      return [];
    }

    return [{
      label: label.slice(0, 200),
      value: displayValue.slice(0, 500),
    }];
  });

  if (!optionRows.length) {
    return undefined;
  }

  return { optionRows };
}
