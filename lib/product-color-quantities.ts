import type { ProductColorField, SelectedProductColor } from "@/lib/product-colors";

export type ColorQuantitiesByOptionId = Record<string, number>;

export function isQuantityColorField(
  field: Pick<ProductColorField, "selectionMode">,
): boolean {
  return field.selectionMode === "quantity";
}

export function sumColorQuantities(
  quantities: ColorQuantitiesByOptionId,
): number {
  return Object.values(quantities).reduce(
    (total, quantity) => total + (Number.isFinite(quantity) ? Math.max(0, quantity) : 0),
    0,
  );
}

export function validateColorQuantities(
  field: Pick<ProductColorField, "label" | "requiredTotalQuantity">,
  quantities: ColorQuantitiesByOptionId,
): string | null {
  const requiredTotal = field.requiredTotalQuantity ?? 0;
  if (requiredTotal < 1) {
    return `Невалидна настройка за „${field.label}“.`;
  }

  const selectedTotal = sumColorQuantities(quantities);
  if (selectedTotal !== requiredTotal) {
    return `Изберете точно ${requiredTotal} броя за „${field.label}“ (избрани ${selectedTotal} от ${requiredTotal}).`;
  }

  return null;
}

export function formatSelectedColorQuantityLabel(
  color: Pick<SelectedProductColor, "optionName" | "quantity">,
): string {
  if (color.quantity !== undefined && color.quantity > 0) {
    return `${color.optionName} × ${color.quantity}`;
  }

  return color.optionName;
}

export function formatSelectedColorsQuantitySummary(
  colors: readonly Pick<SelectedProductColor, "optionName" | "quantity">[],
): string {
  return colors
    .filter((color) => color.quantity === undefined || color.quantity > 0)
    .map((color) => formatSelectedColorQuantityLabel(color))
    .join(", ");
}

export function quantitiesFromSelectedColors(
  colors: readonly SelectedProductColor[],
): Record<string, ColorQuantitiesByOptionId> {
  const byField: Record<string, ColorQuantitiesByOptionId> = {};

  for (const color of colors) {
    if (color.quantity === undefined) {
      continue;
    }

    const fieldQuantities = byField[color.fieldId] ?? {};
    fieldQuantities[color.optionId] = color.quantity;
    byField[color.fieldId] = fieldQuantities;
  }

  return byField;
}

export function flattenSelectedColorsFromQuantities(
  colorFields: readonly ProductColorField[],
  quantitiesByFieldId: Record<string, ColorQuantitiesByOptionId>,
): SelectedProductColor[] {
  const out: SelectedProductColor[] = [];

  for (const field of colorFields) {
    if (!isQuantityColorField(field)) {
      continue;
    }

    const quantities = quantitiesByFieldId[field.id] ?? {};
    for (const option of field.options) {
      const quantity = quantities[option.id] ?? 0;
      if (quantity <= 0) {
        continue;
      }

      out.push({
        fieldId: field.id,
        fieldLabel: field.label,
        groupId: field.groupId,
        groupKey: field.key,
        groupLabel: field.groupLabel,
        optionId: option.id,
        optionName: option.name,
        optionHex: option.hex,
        quantity,
      });
    }
  }

  return out;
}

export function filterSelectedColorsForOrder(
  colors: readonly SelectedProductColor[],
): SelectedProductColor[] {
  return colors.filter((color) => color.quantity === undefined || color.quantity > 0);
}
