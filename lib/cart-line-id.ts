import type { SelectedProductColor } from "@/lib/product-colors";

function serializeColors(selectedColors?: SelectedProductColor[]) {
  if (!selectedColors || selectedColors.length === 0) {
    return "";
  }

  return [...selectedColors]
    .sort((a, b) => {
      const fieldCmp = a.fieldId.localeCompare(b.fieldId);
      if (fieldCmp !== 0) {
        return fieldCmp;
      }
      return a.optionId.localeCompare(b.optionId);
    })
    .map((item) => `${item.fieldId}:${item.optionId}`)
    .join("|");
}

/** Stable id for merging cart lines (same product + same options). */
export function makeCartLineId(
  slug: string,
  personalization?: string,
  selectedColors?: SelectedProductColor[],
): string {
  const p = personalization?.trim() ?? "";
  const colors = serializeColors(selectedColors);
  return `${slug}::${p}::${colors}`;
}
