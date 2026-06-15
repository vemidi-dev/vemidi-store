import type { ProductFulfillmentType } from "@/lib/product-fulfillment";

export type AdminTab =
  | "products"
  | "categories"
  | "colors"
  | "promotions"
  | "orders"
  | "withdrawals"
  | "blog"
  | "events"
  | "wishes"
  | "subscribers"
  | "content";

export type SubscriptionTopic = "blog" | "products" | "events";

export type NewsletterSubscriberRow = {
  id: string;
  email: string;
  topics: SubscriptionTopic[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type WishTemplateRow = {
  id: string;
  title: string;
  body: string;
  is_active: boolean;
  sort_order: number;
};

export type WishTemplateOccasionRow = {
  wish_template_id: string;
  category_id: string;
};

export type ProductWishTemplateRow = {
  product_id: string;
  wish_template_id: string;
  sort_order: number;
};

export type ProductPersonalizationFieldRow = {
  id: string;
  product_id: string;
  label: string;
  field_key: string;
  field_type: "text" | "textarea" | "date";
  placeholder: string | null;
  max_length: number;
  price_delta: number;
  is_required: boolean;
  allows_wish_templates: boolean;
  sort_order: number;
};

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

export type EventGalleryImageRow = {
  id: string;
  image_url: string;
  alt_text: string | null;
  sort_order: number;
  is_published: boolean;
  created_at: string;
};

export type EventRegistrationRow = {
  id: string;
  event_id: string;
  full_name: string;
  phone: string;
  email: string | null;
  participant_count: number;
  note: string | null;
  status: "new" | "confirmed" | "cancelled";
  created_at: string;
  updated_at: string;
};

export type ProductRow = {
  id: string;
  slug: string;
  product_code: string;
  name: string;
  description: string;
  additional_info: string | null;
  fulfillment_note: string | null;
  price: number;
  image_url: string | null;
  is_customizable: boolean;
  is_sold_out: boolean;
  fulfillment_type?: ProductFulfillmentType;
  stock_quantity?: number | null;
  card_badge?: string | null;
};

export type ProductImageRow = {
  id: string;
  product_id: string;
  image_url: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
};

export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  category_type: "product" | "occasion";
  parent_id: string | null;
  show_on_home: boolean;
  home_sort_order: number;
  card_description: string | null;
};

export type ProductCategoryRow = {
  product_id: string;
  category_id: string;
};

export type HomeFeaturedProductRow = {
  product_id: string;
  sort_order: number;
};

export type RelatedProductRow = {
  product_id: string;
  related_product_id: string;
  sort_order: number;
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

export type ProductDraftPersonalizationField = {
  label: string;
  key: string;
  type: "text" | "textarea" | "date";
  placeholder: string;
  maxLength: number;
  priceDelta: number;
  required: boolean;
  allowsWishTemplates: boolean;
};

export type ProductCreateDraft = {
  name: string;
  slug: string;
  description: string;
  additionalInfo: string;
  fulfillmentNote: string;
  price: string;
  isCustomizable: boolean;
  isSoldOut: boolean;
  fulfillmentType: ProductFulfillmentType;
  stockQuantity: number | null;
  cardBadge: string;
  categoryIds: string[];
  colorFields: ProductDraftColorField[];
  personalizationFields: ProductDraftPersonalizationField[];
  wishTemplateIds: string[];
  optionGroups?: ProductDraftOptionGroup[];
};

export type ParsedColorField = {
  label: string;
  groupId: string;
  minSelect: number;
  maxSelect: number;
  optionIds: string[];
  sortOrder: number;
};

export type ParsedPersonalizationField =
  ProductDraftPersonalizationField & {
    sortOrder: number;
  };

export type ProductOptionGroupRow = {
  id: string;
  product_id: string;
  name: string;
  key: string;
  input_type: "single" | "multiple" | "text" | "textarea" | "date";
  is_required: boolean;
  min_select: number;
  max_select: number;
  sort_order: number;
  is_active: boolean;
  pricing_mode: string;
  depends_on_option_id: string | null;
  placeholder: string | null;
  max_length: number | null;
  text_price_delta: number;
};

export type ProductOptionValueRow = {
  id: string;
  group_id: string;
  label: string;
  key: string;
  price_delta: number;
  is_default: boolean;
  is_active: boolean;
  is_sold_out: boolean;
  sku: string | null;
  sort_order: number;
};

export type ParsedOptionValue = {
  id: string | null;
  label: string;
  key: string;
  priceDelta: number;
  isDefault: boolean;
  isActive: boolean;
  isSoldOut: boolean;
  sku: string | null;
  sortOrder: number;
};

export type ParsedOptionGroup = {
  id: string | null;
  name: string;
  key: string;
  inputType: "single" | "multiple" | "text" | "textarea" | "date";
  isRequired: boolean;
  minSelect: number;
  maxSelect: number;
  sortOrder: number;
  isActive: boolean;
  pricingMode: "delta";
  dependsOnOptionId: string | null;
  placeholder: string | null;
  maxLength: number | null;
  textPriceDelta: number;
  values: ParsedOptionValue[];
};

export type ProductDraftOptionGroup = ParsedOptionGroup;
