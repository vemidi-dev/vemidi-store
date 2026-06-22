import type { CartLineDisplayRow } from "@/lib/cart/build-cart-line-display";
import type { CartLine } from "@/lib/cart-types";
import {
  formatSelectedColorQuantityLabel,
  formatSelectedColorsQuantitySummary,
} from "@/lib/product-color-quantities";

export type CartLineSummaryRow = CartLineDisplayRow;

export function resolveCartLineSummaryRows(line: CartLine): CartLineSummaryRow[] {
  const rows: CartLineSummaryRow[] = [];

  if (line.displaySnapshot?.optionRows.length) {
    rows.push(...line.displaySnapshot.optionRows);
  } else {
    const colorsByField = new Map<string, NonNullable<CartLine["selectedColors"]>>();

    for (const color of line.selectedColors ?? []) {
      const fieldColors = colorsByField.get(color.fieldId) ?? [];
      fieldColors.push(color);
      colorsByField.set(color.fieldId, fieldColors);
    }

    for (const colors of colorsByField.values()) {
      const usesQuantities = colors.some((color) => color.quantity !== undefined);
      if (usesQuantities) {
        rows.push({
          label: colors[0]?.fieldLabel ?? "Цвят",
          value: formatSelectedColorsQuantitySummary(colors),
        });
        continue;
      }

      for (const color of colors) {
        rows.push({
          label: color.fieldLabel,
          value: formatSelectedColorQuantityLabel(color),
        });
      }
    }

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
  }

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
