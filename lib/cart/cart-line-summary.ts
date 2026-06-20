import type { CartLineDisplayRow } from "@/lib/cart/build-cart-line-display";
import type { CartLine } from "@/lib/cart-types";

export type CartLineSummaryRow = CartLineDisplayRow;

export function resolveCartLineSummaryRows(line: CartLine): CartLineSummaryRow[] {
  const rows: CartLineSummaryRow[] = [];

  if (line.displaySnapshot?.optionRows.length) {
    rows.push(...line.displaySnapshot.optionRows);
  } else {
    for (const color of line.selectedColors ?? []) {
      rows.push({
        label: color.fieldLabel,
        value: color.optionName,
      });
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
