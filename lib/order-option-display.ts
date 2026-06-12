import type { ProductOptionSelectionSnapshot } from "@/lib/product-options";
import { formatPriceDelta } from "@/lib/product-option-pricing";

export function parseOrderOptionSelections(
  raw: unknown,
): ProductOptionSelectionSnapshot[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.flatMap((entry) => {
    if (!entry || typeof entry !== "object") {
      return [];
    }
    const value = entry as Record<string, unknown>;
    if (typeof value.groupName !== "string") {
      return [];
    }

    const values = Array.isArray(value.values)
      ? value.values.flatMap((item) => {
          if (!item || typeof item !== "object") {
            return [];
          }
          const row = item as Record<string, unknown>;
          if (typeof row.label !== "string") {
            return [];
          }
          return [{
            valueId: String(row.valueId ?? ""),
            label: row.label,
            key: String(row.key ?? ""),
            priceDelta: typeof row.priceDelta === "number" ? row.priceDelta : 0,
            sku: typeof row.sku === "string" ? row.sku : null,
          }];
        })
      : [];

    return [{
      groupId: String(value.groupId ?? ""),
      groupName: value.groupName,
      groupKey: String(value.groupKey ?? ""),
      inputType: value.inputType as ProductOptionSelectionSnapshot["inputType"],
      textValue: typeof value.textValue === "string" ? value.textValue : null,
      values,
      groupPriceDelta:
        typeof value.groupPriceDelta === "number" ? value.groupPriceDelta : 0,
    }];
  });
}

export function formatOrderOptionLine(
  group: ProductOptionSelectionSnapshot,
): string {
  if (group.textValue) {
    const delta = formatPriceDelta(group.groupPriceDelta);
    return `${group.groupName}: ${group.textValue}${delta ? ` (${delta})` : ""}`;
  }

  return group.values
    .map((value) => {
      const delta = formatPriceDelta(value.priceDelta);
      return `${group.groupName}: ${value.label}${delta ? ` (${delta})` : ""}`;
    })
    .join("; ");
}

export function formatCartOptionSelections(
  groups: ProductOptionSelectionSnapshot[],
): string[] {
  return groups.map((group) => formatOrderOptionLine(group));
}
