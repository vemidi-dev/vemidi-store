import type { CartLineDisplayRow } from "@/lib/cart/build-cart-line-display";
import type { CartLine } from "@/lib/cart-types";
import {
  formatSelectedColorQuantityLabel,
  formatSelectedColorsQuantitySummary,
} from "@/lib/product-color-quantities";

export type CartLineSummaryRow = CartLineDisplayRow;

function buildLegacyOptionSummaryRows(line: CartLine): CartLineSummaryRow[] {
  const rows: CartLineSummaryRow[] = [];

  for (const selection of line.optionSelections ?? []) {
    if (selection.textValue?.trim()) {
      rows.push({
        label: "Опция",
        value: selection.textValue.trim(),
      });
      continue;
    }

    if (selection.valueIds.length > 0) {
      rows.push({
        label: "Опция",
        value: `${selection.valueIds.length} избора`,
      });
    }
  }

  return rows;
}

export function buildSelectedColorSummaryRows(
  selectedColors: CartLine["selectedColors"],
  existingRows: readonly CartLineSummaryRow[] = [],
): CartLineSummaryRow[] {
  const rows: CartLineSummaryRow[] = [];
  const existingLabels = new Set(existingRows.map((row) => row.label));
  const colorsByField = new Map<string, NonNullable<CartLine["selectedColors"]>>();

  for (const color of selectedColors ?? []) {
    const fieldColors = colorsByField.get(color.fieldId) ?? [];
    fieldColors.push(color);
    colorsByField.set(color.fieldId, fieldColors);
  }

  for (const colors of colorsByField.values()) {
    const fieldLabel = colors[0]?.fieldLabel ?? "Цвят";
    if (existingLabels.has(fieldLabel)) {
      continue;
    }

    const usesQuantities = colors.some((color) => color.quantity !== undefined);
    if (usesQuantities) {
      rows.push({
        label: fieldLabel,
        value: formatSelectedColorsQuantitySummary(colors),
      });
      continue;
    }

    for (const color of colors) {
      if (existingLabels.has(color.fieldLabel)) {
        continue;
      }

      rows.push({
        label: color.fieldLabel,
        value: formatSelectedColorQuantityLabel(color),
      });
    }
  }

  return rows;
}

export function resolveCartLineSummaryRows(line: CartLine): CartLineSummaryRow[] {
  const rows: CartLineSummaryRow[] = [];

  if (line.displaySnapshot?.optionRows.length) {
    rows.push(...line.displaySnapshot.optionRows);
  } else {
    rows.push(...buildLegacyOptionSummaryRows(line));
  }

  rows.push(...buildSelectedColorSummaryRows(line.selectedColors, rows));

  for (const field of line.personalizationFields ?? []) {
    rows.push({
      label: field.label,
      value: field.value,
    });
  }

  if (line.personalization?.trim() && !line.personalizationFields?.length) {
    rows.push({
      label: "Персонализация",
      value: line.personalization.trim(),
    });
  }

  return rows;
}

export function cartLineSummaryIncludesCampaign(line: CartLine): boolean {
  return resolveCartLineSummaryRows(line).some((row) =>
    /кампания/i.test(row.label),
  );
}
