import type { AdminTab } from "@/lib/admin/types";
import {
  normalizeFulfillmentType,
  parseStockQuantity,
  validateFulfillmentInput,
  type ProductFulfillmentType,
} from "@/lib/product-fulfillment";
import { adminFormFields } from "@/lib/admin/form-fields";
import { parseProductOptionGroups } from "@/lib/admin/parse-option-groups";

type CreateProductDraftPayload = {
  name: string;
  slug: string;
  description: string;
  additional_info: string;
  fulfillment_note: string;
  price: string;
  is_customizable: boolean;
  is_sold_out: boolean;
  fulfillment_type: string;
  stock_quantity: string;
  card_badge: string;
  category_ids: string[];
  primary_category_id: string | null;
  color_fields: Array<{
    label: string;
    group_id: string;
    min_select: string;
    max_select: string;
    option_ids: string;
  }>;
  personalization_fields: Array<{
    label: string;
    field_key: string;
    field_type: string;
    placeholder: string;
    max_length: string;
    price_delta: string;
    is_required: boolean;
    allows_wish_templates: boolean;
  }>;
  wish_template_ids: string[];
  option_groups: unknown[];
};

export function parseProductFulfillmentFromFormData(formData: FormData): {
  fulfillmentType: ProductFulfillmentType;
  stockQuantity: number | null;
  error: string | null;
} {
  const fulfillmentType = normalizeFulfillmentType(
    getString(formData, adminFormFields.product.fulfillmentType) || "made_to_order",
  );
  const rawStock = getString(formData, adminFormFields.product.stockQuantity);
  const stockQuantity =
    fulfillmentType === "stocked" ? parseStockQuantity(rawStock) : null;
  const error = validateFulfillmentInput(fulfillmentType, stockQuantity);

  return { fulfillmentType, stockQuantity, error };
}

export function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export function getOptionalString(formData: FormData, key: string) {
  return getString(formData, key) || null;
}

export function getPrice(formData: FormData) {
  const parsed = Number(getString(formData, adminFormFields.product.price));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function isChecked(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

export function getFile(formData: FormData, key: string): File | null {
  const value = formData.get(key);
  return value instanceof File && value.size > 0 ? value : null;
}

export function getFiles(formData: FormData, key: string): File[] {
  return formData
    .getAll(key)
    .filter((value): value is File => value instanceof File && value.size > 0);
}

export function getCategoryIds(formData: FormData) {
  return Array.from(
    new Set(
      formData
        .getAll(adminFormFields.product.categoryIds)
        .map((value) => String(value ?? "").trim())
        .filter(Boolean),
    ),
  );
}

export function getPrimaryCategoryId(formData: FormData) {
  return getOptionalString(formData, adminFormFields.product.primaryCategoryId);
}

export function getWishTemplateIds(formData: FormData) {
  return Array.from(
    new Set(
      formData
        .getAll(adminFormFields.product.wishTemplateIds)
        .map((value) => String(value ?? "").trim())
        .filter(Boolean),
    ),
  );
}

export function normalizeSlug(raw: string) {
  return raw.trim().toLowerCase();
}

export function getAdminTab(formData: FormData, fallback: AdminTab): AdminTab {
  const raw = getString(formData, adminFormFields.common.tab);
  return raw === "categories" ||
    raw === "colors" ||
    raw === "promotions" ||
    raw === "products" ||
    raw === "orders" ||
    raw === "blog" ||
    raw === "events" ||
    raw === "wishes" ||
    raw === "subscribers" ||
    raw === "content"
    ? raw
    : fallback;
}

export function parseSelectLimit(value: string, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

export function makeCreateProductDraft(formData: FormData) {
  const labels = formData
    .getAll(adminFormFields.colorField.labels)
    .map((value) => String(value ?? "").trim());
  const groupIds = formData
    .getAll(adminFormFields.colorField.groupIds)
    .map((value) => String(value ?? "").trim());
  const mins = formData
    .getAll(adminFormFields.colorField.minSelects)
    .map((value) => String(value ?? "").trim());
  const maxes = formData
    .getAll(adminFormFields.colorField.maxSelects)
    .map((value) => String(value ?? "").trim());
  const optionIds = formData
    .getAll(adminFormFields.colorField.optionIds)
    .map((value) => String(value ?? "").trim());

  const longestLength = Math.max(
    labels.length,
    groupIds.length,
    mins.length,
    maxes.length,
    optionIds.length,
  );
  const colorFields = Array.from({ length: longestLength }, (_, index) => ({
    label: labels[index] ?? "",
    group_id: groupIds[index] ?? "",
    min_select: mins[index] ?? "",
    max_select: maxes[index] ?? "",
    option_ids: optionIds[index] ?? "",
  })).filter((field) => field.label || field.group_id || field.option_ids);

  const personalizationLabels = formData
    .getAll(adminFormFields.personalizationField.labels)
    .map((value) => String(value ?? "").trim());
  const personalizationKeys = formData
    .getAll(adminFormFields.personalizationField.keys)
    .map((value) => String(value ?? "").trim());
  const personalizationTypes = formData
    .getAll(adminFormFields.personalizationField.types)
    .map((value) => String(value ?? "").trim());
  const personalizationPlaceholders = formData
    .getAll(adminFormFields.personalizationField.placeholders)
    .map((value) => String(value ?? "").trim());
  const personalizationMaxLengths = formData
    .getAll(adminFormFields.personalizationField.maxLengths)
    .map((value) => String(value ?? "").trim());
  const personalizationPriceDeltas = formData
    .getAll(adminFormFields.personalizationField.priceDeltas)
    .map((value) => String(value ?? "").trim());
  const personalizationRequired = formData
    .getAll(adminFormFields.personalizationField.required)
    .map((value) => String(value) === "1");
  const personalizationAllowsWishes = formData
    .getAll(adminFormFields.personalizationField.allowsWishes)
    .map((value) => String(value) === "1");
  const personalizationFields = personalizationLabels.map((label, index) => ({
    label,
    field_key: personalizationKeys[index] ?? "",
    field_type: personalizationTypes[index] ?? "text",
    placeholder: personalizationPlaceholders[index] ?? "",
    max_length: personalizationMaxLengths[index] ?? "",
    price_delta: personalizationPriceDeltas[index] ?? "0",
    is_required: personalizationRequired[index] ?? false,
    allows_wish_templates: personalizationAllowsWishes[index] ?? false,
  }));
  const optionGroupsResult = parseProductOptionGroups(formData);

  const draft: CreateProductDraftPayload = {
    name: getString(formData, adminFormFields.product.name),
    slug: getString(formData, adminFormFields.product.slug),
    description: getString(formData, adminFormFields.product.description),
    additional_info: getString(formData, adminFormFields.product.additionalInfo),
    fulfillment_note: getString(formData, adminFormFields.product.fulfillmentNote),
    price: getString(formData, adminFormFields.product.price),
    is_customizable: isChecked(formData, adminFormFields.product.isCustomizable),
    is_sold_out: isChecked(formData, adminFormFields.product.isSoldOut),
    fulfillment_type: getString(formData, adminFormFields.product.fulfillmentType) || "made_to_order",
    stock_quantity: getString(formData, adminFormFields.product.stockQuantity),
    card_badge: getString(formData, adminFormFields.product.cardBadge),
    category_ids: getCategoryIds(formData),
    primary_category_id: getPrimaryCategoryId(formData),
    color_fields: colorFields,
    personalization_fields: personalizationFields,
    wish_template_ids: getWishTemplateIds(formData),
    option_groups: optionGroupsResult.error ? [] : optionGroupsResult.groups,
  };

  return JSON.stringify(draft);
}
