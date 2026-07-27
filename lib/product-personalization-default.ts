import type { Product } from "@/lib/catalog";

export function resolvePersonalizationDetailsOpen(
  personalizationOpenByDefault: Product["personalizationOpenByDefault"],
  usesMaterialStockLayout: boolean,
  hasRequiredPersonalizationFields: boolean,
): boolean {
  if (personalizationOpenByDefault != null) {
    return personalizationOpenByDefault;
  }

  if (usesMaterialStockLayout) {
    return false;
  }

  return hasRequiredPersonalizationFields;
}
