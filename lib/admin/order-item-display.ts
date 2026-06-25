import type { StoreOrderItem } from "@/lib/admin/orders";
import { formatOrderOptionLine } from "@/lib/order-option-display";
import {
  formatSelectedColorQuantityLabel,
  formatSelectedColorsQuantitySummary,
} from "@/lib/product-color-quantities";

export type StoreOrderItemDetailLine = {
  text: string;
};

export function buildStoreOrderItemDetailLines(
  item: Pick<
    StoreOrderItem,
    | "personalization"
    | "personalizationFields"
    | "selectedColors"
    | "optionSelections"
  >,
): StoreOrderItemDetailLine[] {
  const lines: StoreOrderItemDetailLine[] = [];
  const hasStructuredPersonalization = item.personalizationFields.length > 0;

  if (hasStructuredPersonalization) {
    for (const field of item.personalizationFields) {
      if (field.label?.trim() && field.value?.trim()) {
        lines.push({
          text: `${field.label}: ${field.value.trim()}`,
        });
      }
    }
  } else if (item.personalization?.trim()) {
    lines.push({
      text: `Персонализация: ${item.personalization.trim()}`,
    });
  }

  const colorsByField = new Map<string, NonNullable<StoreOrderItem["selectedColors"]>>();

  for (const color of item.selectedColors ?? []) {
    const fieldColors = colorsByField.get(color.fieldId ?? color.fieldLabel ?? "") ?? [];
    fieldColors.push(color);
    colorsByField.set(color.fieldId ?? color.fieldLabel ?? "", fieldColors);
  }

  for (const colors of colorsByField.values()) {
    const usesQuantities = colors.some(
      (color) => typeof color.quantity === "number" && color.quantity > 0,
    );

    if (usesQuantities) {
      lines.push({
        text: `${colors[0]?.fieldLabel || "Цвят"}: ${formatSelectedColorsQuantitySummary(
          colors.map((color) => ({
            optionName: color.optionName || "—",
            quantity: color.quantity,
          })),
        )}`,
      });
      continue;
    }

    for (const color of colors) {
      lines.push({
        text: `${color.fieldLabel || "Цвят"}: ${formatSelectedColorQuantityLabel({
          optionName: color.optionName || "—",
          quantity: color.quantity,
        })}`,
      });
    }
  }

  for (const group of item.optionSelections) {
    lines.push({
      text: formatOrderOptionLine(group),
    });
  }

  return lines;
}

export function shouldShowOrderPersonalizationSummary(
  storeItemCount: number,
  summary: string,
): boolean {
  return storeItemCount === 0 && Boolean(summary.trim());
}
