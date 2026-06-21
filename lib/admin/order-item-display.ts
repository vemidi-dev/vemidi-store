import type { StoreOrderItem } from "@/lib/admin/orders";
import { formatOrderOptionLine } from "@/lib/order-option-display";

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

  for (const color of item.selectedColors ?? []) {
    lines.push({
      text: `${color.fieldLabel || "Цвят"}: ${color.optionName || "—"}`,
    });
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
