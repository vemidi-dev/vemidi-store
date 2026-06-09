export type AdminTab = "products" | "categories" | "orders" | "blog" | "events";

export type BlogPostRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  image_url: string | null;
  category: string | null;
  author: string | null;
  read_minutes: number | null;
  is_featured: boolean;
  is_popular: boolean;
  cta_link_label: string | null;
  cta_category_id: string | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type EventRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  image_url: string | null;
  event_type: string | null;
  audience: string | null;
  format: string | null;
  price: number | null;
  capacity: number | null;
  available_spots: number | null;
  age_group: string | null;
  address: string | null;
  duration_minutes: number | null;
  includes_text: string | null;
  materials_text: string | null;
  host_name: string | null;
  cancellation_policy: string | null;
  registration_url: string | null;
  location: string | null;
  starts_at: string | null;
  ends_at: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

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
