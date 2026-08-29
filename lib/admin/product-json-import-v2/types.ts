import type { ProductMutationInput } from "@/lib/admin/product-rpc";
import type { ParsedPersonalizationField } from "@/lib/admin/types";
import type { ProductFulfillmentType } from "@/lib/product-fulfillment";
import type { ProductQuantityPriceTier } from "@/lib/product-quantity-pricing";
import type { ProductVisibility } from "@/lib/product-visibility";

import type { PRODUCT_JSON_IMPORT_VERSION } from "@/lib/admin/product-json-import-v2/constants";

export type ProductJsonImportIssueSeverity = "error" | "warning";

export type ProductJsonImportIssue = {
  code: string;
  message: string;
  severity: ProductJsonImportIssueSeverity;
  slug?: string;
};

export type ProductJsonImportFileErrorCode =
  | "INVALID_JSON"
  | "JSON_TOO_LARGE"
  | "UNSUPPORTED_VERSION"
  | "EMPTY_PRODUCTS"
  | "TOO_MANY_PRODUCTS"
  | "INVALID_ROOT";

export type ProductJsonImportParseResult =
  | {
      ok: true;
      file: ProductImportFileV2;
    }
  | {
      ok: false;
      code: ProductJsonImportFileErrorCode;
      message: string;
    };

export type ImportDefaultsV2 = {
  status?: "draft";
  visibility?: ProductVisibility;
  fulfillment_type?: ProductFulfillmentType;
  is_customizable?: boolean;
  promo_code_eligible?: boolean;
  show_quantity_selector?: boolean;
  personalization_open_by_default?: boolean | null;
};

export type ImageImportV2 = {
  original_filename: string;
  alt: string;
  target_filename?: string;
  primary?: boolean;
};

export type PersonalizationFieldImportV2 = {
  label: string;
  field_key: string;
  field_type: "text" | "textarea" | "date";
  placeholder?: string;
  max_length?: number;
  price_delta?: number;
  required?: boolean;
  allows_wish_templates?: boolean;
  sort_order?: number;
};

export type QuantityPriceTierImportV2 = {
  minQuantity: number;
  maxQuantity?: number | null;
  unitPrice: number;
};

export type ProductImportV2Raw = {
  name?: unknown;
  slug?: unknown;
  product_code?: unknown;
  price?: unknown;
  subtitle?: unknown;
  heading_subtitle?: unknown;
  short_description?: unknown;
  description?: unknown;
  additional_info?: unknown;
  personalization_info?: unknown;
  personalization_notes?: unknown;
  dimensions_materials?: unknown;
  ordering_info?: unknown;
  fulfillment_note?: unknown;
  card_badge?: unknown;
  is_sold_out?: unknown;
  is_customizable?: unknown;
  show_quantity_selector?: unknown;
  promo_code_eligible?: unknown;
  fulfillment_type?: unknown;
  stock_quantity?: unknown;
  visibility?: unknown;
  personalization_open_by_default?: unknown;
  meta_title?: unknown;
  meta_description?: unknown;
  og_title?: unknown;
  og_description?: unknown;
  categories?: unknown;
  primary_category?: unknown;
  personalization_fields?: unknown;
  quantity_price_tiers?: unknown;
  images?: unknown;
};

export type ProductImportFileV2 = {
  version: typeof PRODUCT_JSON_IMPORT_VERSION;
  import_key?: string;
  defaults?: ImportDefaultsV2;
  products: ProductImportV2Raw[];
};

export type NormalizedProductImportV2 = {
  slug: string;
  name: string;
  productCode: string | null;
  price: number;
  subtitle: string | null;
  headingSubtitle: string | null;
  description: string;
  additionalInfo: string | null;
  personalizationInfo: string | null;
  dimensionsMaterials: string | null;
  orderingInfo: string | null;
  fulfillmentNote: string | null;
  cardBadge: string | null;
  isSoldOut: boolean;
  isCustomizable: boolean;
  showQuantitySelector: boolean;
  promoCodeEligible: boolean;
  fulfillmentType: ProductFulfillmentType;
  stockQuantity: number | null;
  visibility: ProductVisibility;
  personalizationOpenByDefault: boolean | null;
  metaTitle: string | null;
  metaDescription: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  categorySlugs: string[];
  primaryCategorySlug: string;
  personalizationFields: ParsedPersonalizationField[];
  quantityPriceTiers: ProductQuantityPriceTier[];
  images: ImageImportV2[];
};

export type ProductImportPreviewStatus = "ready" | "warning" | "error";

export type ProductImportPreview = {
  slug: string;
  name: string;
  price: number;
  categorySlugs: string[];
  primaryCategorySlug: string;
  imageCount: number;
  status: ProductImportPreviewStatus;
  errors: ProductJsonImportIssue[];
  warnings: ProductJsonImportIssue[];
};

export type ProductJsonImportSyncValidationResult = {
  ok: boolean;
  importKey?: string;
  fileErrors: ProductJsonImportIssue[];
  fileWarnings: ProductJsonImportIssue[];
  previews: ProductImportPreview[];
  normalizedProducts: NormalizedProductImportV2[];
};

export type ProductImportPostCreateFields = {
  visibility: ProductVisibility;
  showQuantitySelector: boolean;
  promoCodeEligible: boolean;
  quantityPriceTiers: ProductQuantityPriceTier[];
  personalizationOpenByDefault: boolean | null;
};

export type ProductImportMutationPayload = {
  slug: string;
  categorySlugs: string[];
  primaryCategorySlug: string;
  mutationInput: Omit<
    ProductMutationInput,
    "categoryIds" | "primaryCategoryId" | "colorFields" | "optionGroups" | "wishTemplateIds"
  >;
  postCreate: ProductImportPostCreateFields;
};

export type ProductImportMapResult =
  | {
      ok: true;
      payload: ProductImportMutationPayload;
      warnings: ProductJsonImportIssue[];
    }
  | {
      ok: false;
      warnings: ProductJsonImportIssue[];
    };

export type MatchedProductImages = {
  slug: string;
  matchedFiles: Array<{ originalFilename: string; alt: string }>;
  sortedImages: ImageImportV2[];
  errors: ProductJsonImportIssue[];
  warnings: ProductJsonImportIssue[];
};
