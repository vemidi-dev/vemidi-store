import type { AdminTab } from "@/lib/admin/types";
import { adminFormFields } from "@/lib/admin/form-fields";

type CreateProductDraftPayload = {
  name: string;
  description: string;
  additional_info: string;
  fulfillment_note: string;
  price: string;
  is_customizable: boolean;
  category_ids: string[];
  color_fields: Array<{
    label: string;
    group_id: string;
    min_select: string;
    max_select: string;
    option_ids: string;
  }>;
};

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

export function normalizeSlug(raw: string) {
  return raw.trim().toLowerCase();
}

export function getAdminTab(formData: FormData, fallback: AdminTab): AdminTab {
  const raw = getString(formData, adminFormFields.common.tab);
  return raw === "categories" ||
    raw === "products" ||
    raw === "orders" ||
    raw === "blog" ||
    raw === "events" ||
    raw === "wishes" ||
    raw === "subscribers"
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

  const draft: CreateProductDraftPayload = {
    name: getString(formData, adminFormFields.product.name),
    description: getString(formData, adminFormFields.product.description),
    additional_info: getString(formData, adminFormFields.product.additionalInfo),
    fulfillment_note: getString(formData, adminFormFields.product.fulfillmentNote),
    price: getString(formData, adminFormFields.product.price),
    is_customizable: isChecked(formData, adminFormFields.product.isCustomizable),
    category_ids: getCategoryIds(formData),
    color_fields: colorFields,
  };

  return JSON.stringify(draft);
}
