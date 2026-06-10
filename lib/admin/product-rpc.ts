import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import type {
  ParsedColorField,
  ParsedPersonalizationField,
} from "@/lib/admin/types";

export type ProductMutationInput = {
  name: string;
  description: string;
  additionalInfo: string | null;
  fulfillmentNote: string | null;
  price: number;
  imageUrl: string | null;
  isCustomizable: boolean;
  isSoldOut: boolean;
  cardBadge: string | null;
  categoryIds: string[];
  colorFields: ParsedColorField[];
  personalizationFields: ParsedPersonalizationField[];
  wishTemplateIds: string[];
};

function toColorFieldsPayload(fields: ParsedColorField[]) {
  return fields.map((field) => ({
    label: field.label,
    group_id: field.groupId,
    min_select: field.minSelect,
    max_select: field.maxSelect,
    option_ids: field.optionIds,
    sort_order: field.sortOrder,
  }));
}

function toRpcInput(input: ProductMutationInput) {
  return {
    p_name: input.name,
    p_description: input.description,
    p_additional_info: input.additionalInfo ?? "",
    p_fulfillment_note: input.fulfillmentNote ?? "",
    p_price: input.price,
    p_image_url: input.imageUrl ?? "",
    p_is_customizable: input.isCustomizable,
    p_is_sold_out: input.isSoldOut,
    p_card_badge: input.cardBadge ?? "",
    p_category_ids: input.categoryIds,
    p_color_fields: toColorFieldsPayload(input.colorFields),
    p_personalization_fields: input.personalizationFields.map((field) => ({
      label: field.label,
      field_key: field.key,
      field_type: field.type,
      placeholder: field.placeholder,
      max_length: field.maxLength,
      is_required: field.required,
      allows_wish_templates: field.allowsWishTemplates,
      sort_order: field.sortOrder,
    })),
    p_wish_template_ids: input.wishTemplateIds,
  };
}

export async function createProductAtomic(
  supabase: SupabaseClient,
  input: ProductMutationInput,
) {
  return supabase.rpc("admin_create_product_v3", toRpcInput(input));
}

export async function updateProductAtomic(
  supabase: SupabaseClient,
  productId: string,
  input: ProductMutationInput,
) {
  return supabase.rpc("admin_update_product_v3", {
    p_product_id: productId,
    ...toRpcInput(input),
  });
}

export async function deleteProductAtomic(supabase: SupabaseClient, productId: string) {
  return supabase.rpc("admin_delete_product", { p_product_id: productId });
}

const rpcErrorMessages: Record<string, string> = {
  admin_required: "Нямате администраторски права.",
  category_required: "Изберете поне една категория.",
  invalid_category: "Избрана е невалидна категория.",
  invalid_color_field: "Невалидни настройки на цветово поле.",
  invalid_color_group: "Избрана е невалидна цветова група.",
  insufficient_color_options: "Цветовото поле няма достатъчно позволени опции.",
  invalid_color_option: "Избрана е невалидна цветова опция.",
  invalid_personalization_field: "Невалидни настройки на поле за персонализация.",
  invalid_wish_template: "Избрано е невалидно готово пожелание.",
  product_text_required: "Името и описанието са задължителни.",
  invalid_price: "Цената е невалидна.",
  product_not_found: "Продуктът не е намерен.",
};

export function getProductMutationErrorMessage(
  error: Pick<PostgrestError, "code" | "message" | "details" | "hint"> | null | undefined,
) {
  const message = [error?.message, error?.details, error?.hint].filter(Boolean).join(" ");

  if (!message) {
    return "Неуспешна операция с продукта.";
  }

  if (message.includes("Could not find the function")) {
    return "Липсва Supabase RPC миграцията за атомични продуктови операции.";
  }

  if (
    error?.code === "42501" ||
    message.toLowerCase().includes("permission denied")
  ) {
    return "Липсват права за запис. Изпълнете restore_admin_product_write_grants.sql в Supabase.";
  }

  const knownError = Object.entries(rpcErrorMessages).find(([code]) =>
    message.includes(code),
  );
  return knownError?.[1] ?? `Неуспешна операция с продукта (${error?.code || "Supabase"}).`;
}
