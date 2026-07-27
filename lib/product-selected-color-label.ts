import type { ProductColorField } from "@/lib/product-colors";
import {
  isQuantityColorField,
  type ColorQuantitiesByOptionId,
} from "@/lib/product-color-quantities";

export function buildSelectedColorLabel(
  colorFields: ProductColorField[],
  selectedByGroup: Record<string, string[]>,
  quantitiesByField: Record<string, ColorQuantitiesByOptionId>,
): string | null {
  const names: string[] = [];

  colorFields.forEach((field) => {
    if (isQuantityColorField(field)) {
      field.options.forEach((option) => {
        const quantity = quantitiesByField[field.id]?.[option.id] ?? 0;
        if (quantity > 0) {
          names.push(quantity > 1 ? `${option.name} ×${quantity}` : option.name);
        }
      });
      return;
    }

    (selectedByGroup[field.id] ?? []).forEach((optionId) => {
      const option = field.options.find((candidate) => candidate.id === optionId);
      if (option) {
        names.push(option.name);
      }
    });
  });

  return names.length ? names.join(", ") : null;
}
