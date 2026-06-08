export type AdminTab = "products" | "categories" | "orders";

export type ProductRow = {
  id: string;
  name: string;
  description: string;
  additional_info: string | null;
  fulfillment_note: string | null;
  price: number;
  image_url: string | null;
  is_customizable: boolean;
};

export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
};

export type ProductCategoryRow = {
  product_id: string;
  category_id: string;
};

export type ColorGroupRow = {
  id: string;
  key: string;
  label: string;
};

export type ColorOptionRow = {
  id: string;
  group_id: string;
  name: string;
  hex: string | null;
  sort_order: number | null;
  is_active: boolean;
};

export type ProductColorFieldRow = {
  id: string;
  product_id: string;
  group_id: string;
  label: string;
  enabled: boolean;
  min_select: number;
  max_select: number;
  sort_order: number;
};

export type ProductColorFieldOptionRow = {
  field_id: string;
  color_option_id: string;
};

export type ProductDraftColorField = {
  label: string;
  groupId: string;
  minSelect: number;
  maxSelect: number;
  optionIds: string[];
};

export type ProductCreateDraft = {
  name: string;
  description: string;
  additionalInfo: string;
  fulfillmentNote: string;
  price: string;
  isCustomizable: boolean;
  categoryIds: string[];
  colorFields: ProductDraftColorField[];
};

export type ParsedColorField = {
  label: string;
  groupId: string;
  minSelect: number;
  maxSelect: number;
  optionIds: string[];
  sortOrder: number;
};
