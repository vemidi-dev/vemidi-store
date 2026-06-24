import { adminFormFields } from "@/lib/admin/form-fields";
import type { ProductRow } from "@/lib/admin/types";

export const productContentLimits = {
  meta_title: 120,
  meta_description: 160,
  og_title: 120,
  og_description: 160,
} as const;

export type ProductContentPayload = {
  meta_title: string | null;
  meta_description: string | null;
  og_title: string | null;
  og_description: string | null;
};

const fieldLabels: Record<keyof typeof productContentLimits, string> = {
  meta_title: "SEO заглавие",
  meta_description: "Meta описание",
  og_title: "Заглавие при споделяне",
  og_description: "Описание при споделяне",
};

function parseOptionalTextField(
  formData: FormData,
  key: string,
  maxLength: number,
  label: string,
): { value: string | null; error: string | null } {
  const raw = String(formData.get(key) ?? "");
  const trimmed = raw.trim();
  if (!trimmed) {
    return { value: null, error: null };
  }
  if (trimmed.length > maxLength) {
    return {
      value: null,
      error: `${label} надхвърля максимума от ${maxLength} символа.`,
    };
  }
  return { value: trimmed, error: null };
}

export function parseProductContentFromFormData(formData: FormData): {
  payload: ProductContentPayload;
  error: string | null;
} {
  const fields = [
    {
      key: adminFormFields.product.metaTitle,
      limitKey: "meta_title" as const,
    },
    {
      key: adminFormFields.product.metaDescription,
      limitKey: "meta_description" as const,
    },
    {
      key: adminFormFields.product.ogTitle,
      limitKey: "og_title" as const,
    },
    {
      key: adminFormFields.product.ogDescription,
      limitKey: "og_description" as const,
    },
  ];

  const payload: ProductContentPayload = {
    meta_title: null,
    meta_description: null,
    og_title: null,
    og_description: null,
  };

  for (const field of fields) {
    const limit = productContentLimits[field.limitKey];
    const label = fieldLabels[field.limitKey];
    const parsed = parseOptionalTextField(formData, field.key, limit, label);
    if (parsed.error) {
      return { payload, error: parsed.error };
    }
    payload[field.limitKey] = parsed.value;
  }

  return { payload, error: null };
}

export function getProductContentFormDefaults(
  product?: Pick<
    ProductRow,
    "meta_title" | "meta_description" | "og_title" | "og_description"
  >,
) {
  return {
    meta_title: product?.meta_title ?? "",
    meta_description: product?.meta_description ?? "",
    og_title: product?.og_title ?? "",
    og_description: product?.og_description ?? "",
  };
}
