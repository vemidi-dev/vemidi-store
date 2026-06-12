import type {
  ProductOptionGroup,
  ProductOptionSelection,
} from "@/lib/product-options";
import { isChoiceOptionGroup, isTextOptionGroup } from "@/lib/product-options";

export function formatPriceDelta(delta: number): string | null {
  if (!Number.isFinite(delta) || delta === 0) {
    return null;
  }
  const formatted = delta.toFixed(2).replace(".", ",");
  return delta > 0 ? `+${formatted} €` : `${formatted} €`;
}

export function calculateOptionDelta(
  groups: ProductOptionGroup[],
  selections: ProductOptionSelection[],
): number {
  const groupsById = new Map(groups.map((group) => [group.id, group]));
  let total = 0;

  for (const selection of selections) {
    const group = groupsById.get(selection.groupId);
    if (!group || !group.isActive) {
      continue;
    }

    if (isChoiceOptionGroup(group)) {
      const valuesById = new Map(group.values.map((value) => [value.id, value]));
      for (const valueId of selection.valueIds) {
        const value = valuesById.get(valueId);
        if (value?.isActive && !value.isSoldOut) {
          total += value.priceDelta;
        }
      }
      continue;
    }

    if (isTextOptionGroup(group)) {
      const text = selection.textValue?.trim();
      if (text) {
        total += group.textPriceDelta;
      }
    }
  }

  return Math.round(total * 100) / 100;
}

export function calculateEstimatedUnitPrice(
  effectiveBasePrice: number,
  groups: ProductOptionGroup[],
  selections: ProductOptionSelection[],
): number {
  const delta = calculateOptionDelta(groups, selections);
  return Math.max(0, Math.round((effectiveBasePrice + delta) * 100) / 100);
}
