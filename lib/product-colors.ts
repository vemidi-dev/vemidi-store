export type ProductColorOption = {
  id: string;
  name: string;
  hex: string | null;
};

export type ProductColorSelectionMode = "choice" | "quantity";

export type ProductColorField = {
  id: string;
  label: string;
  key: string;
  groupId: string;
  groupLabel: string;
  minSelect: number;
  maxSelect: number;
  selectionMode?: ProductColorSelectionMode;
  requiredTotalQuantity?: number;
  options: ProductColorOption[];
};

export type SelectedProductColor = {
  fieldId: string;
  fieldLabel: string;
  groupId: string;
  groupKey: string;
  groupLabel: string;
  optionId: string;
  optionName: string;
  optionHex: string | null;
  quantity?: number;
};

export function supportsChoiceColorBulkSelect(
  field: Pick<ProductColorField, "selectionMode" | "maxSelect">,
): boolean {
  return field.selectionMode !== "quantity" && field.maxSelect > 1;
}

export function getChoiceColorBulkTargetIds(
  field: Pick<ProductColorField, "options" | "maxSelect">,
): string[] {
  if (field.maxSelect <= 1) {
    return [];
  }

  return field.options.slice(0, field.maxSelect).map((option) => option.id);
}

export function areAllChoiceColorsSelected(
  field: Pick<ProductColorField, "options" | "maxSelect">,
  selectedIds: readonly string[],
): boolean {
  const targetIds = getChoiceColorBulkTargetIds(field);
  if (targetIds.length === 0) {
    return false;
  }

  const selectedSet = new Set(selectedIds);
  return targetIds.every((optionId) => selectedSet.has(optionId));
}
