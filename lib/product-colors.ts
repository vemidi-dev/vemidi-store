export type ProductColorOption = {
  id: string;
  name: string;
  hex: string | null;
};

export type ProductColorField = {
  id: string;
  label: string;
  key: string;
  groupId: string;
  groupLabel: string;
  minSelect: number;
  maxSelect: number;
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
};
