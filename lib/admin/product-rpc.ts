import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import type {
  ParsedColorField,
  ParsedOptionGroup,
  ParsedPersonalizationField,
} from "@/lib/admin/types";
import type { ProductFulfillmentType } from "@/lib/product-fulfillment";

export type ProductMutationInput = {
  name: string;
  slug: string;
  subtitle: string | null;
  headingSubtitle: string | null;
  description: string;
  additionalInfo: string | null;
  personalizationInfo: string | null;
  dimensionsMaterials: string | null;
  orderingInfo: string | null;
  fulfillmentNote: string | null;
  price: number;
  imageUrl: string | null;
  isCustomizable: boolean;
  isSoldOut: boolean;
  fulfillmentType: ProductFulfillmentType;
  stockQuantity: number | null;
  cardBadge: string | null;
  categoryIds: string[];
  primaryCategoryId: string | null;
  colorFields: ParsedColorField[];
  personalizationFields: ParsedPersonalizationField[];
  wishTemplateIds: string[];
  optionGroups: ParsedOptionGroup[];
  metaTitle: string | null;
  metaDescription: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
};

function toColorFieldsPayload(fields: ParsedColorField[]) {
  return fields.map((field) => ({
    label: field.label,
    group_id: field.groupId,
    min_select: field.minSelect,
    max_select: field.maxSelect,
    option_ids: field.optionIds,
    sort_order: field.sortOrder,
    selection_mode: field.selectionMode,
    required_total_quantity: field.requiredTotalQuantity,
  }));
}

function toOptionGroupsPayload(groups: ParsedOptionGroup[]) {
  return groups.map((group) => ({
    id: group.id,
    name: group.name,
    key: group.key,
    input_type: group.inputType,
    is_required: group.isRequired,
    min_select: group.minSelect,
    max_select: group.maxSelect,
    sort_order: group.sortOrder,
    is_active: group.isActive,
    pricing_mode: group.pricingMode,
    depends_on_option_id: group.dependsOnOptionId,
    placeholder: group.placeholder,
    max_length: group.maxLength,
    text_price_delta: group.textPriceDelta,
    values: group.values.map((value) => ({
      id: value.id,
      label: value.label,
      key: value.key,
      price_delta: value.priceDelta,
      is_default: value.isDefault,
      is_active: value.isActive,
      is_sold_out: value.isSoldOut,
      image_url: value.imageUrl ?? null,
      sku: value.sku,
      sort_order: value.sortOrder,
    })),
  }));
}

function toRpcInput(input: ProductMutationInput) {
  return {
    p_name: input.name,
    p_subtitle: input.subtitle ?? "",
    p_heading_subtitle: input.headingSubtitle,
    p_slug: input.slug,
    p_description: input.description,
    p_additional_info: input.additionalInfo ?? "",
    p_fulfillment_note: input.fulfillmentNote ?? "",
    p_personalization_info: input.personalizationInfo,
    p_dimensions_materials: input.dimensionsMaterials,
    p_ordering_info: input.orderingInfo,
    p_price: input.price,
    p_image_url: input.imageUrl ?? "",
    p_is_customizable: input.isCustomizable,
    p_is_sold_out: input.isSoldOut,
    p_fulfillment_type: input.fulfillmentType,
    p_stock_quantity: input.stockQuantity,
    p_card_badge: input.cardBadge ?? "",
    p_category_ids: input.categoryIds,
    p_primary_category_id: input.primaryCategoryId,
    p_color_fields: toColorFieldsPayload(input.colorFields),
    p_personalization_fields: input.personalizationFields.map((field) => ({
      label: field.label,
      field_key: field.key,
      field_type: field.type,
      placeholder: field.placeholder,
      max_length: field.maxLength,
      price_delta: field.priceDelta,
      is_required: field.required,
      allows_wish_templates: field.allowsWishTemplates,
      sort_order: field.sortOrder,
    })),
    p_wish_template_ids: input.wishTemplateIds,
    p_option_groups: toOptionGroupsPayload(input.optionGroups),
    p_meta_title: input.metaTitle,
    p_meta_description: input.metaDescription,
    p_og_title: input.ogTitle,
    p_og_description: input.ogDescription,
  };
}

export function buildProductMutationRpcPayload(input: ProductMutationInput) {
  return toRpcInput(input);
}

export async function createProductAtomic(
  supabase: SupabaseClient,
  input: ProductMutationInput,
) {
  return supabase.rpc("admin_create_product_v11", toRpcInput(input));
}

export async function updateProductAtomic(
  supabase: SupabaseClient,
  productId: string,
  input: ProductMutationInput,
) {
  return supabase.rpc("admin_update_product_v11", {
    p_product_id: productId,
    ...toRpcInput(input),
  });
}

export async function deleteProductAtomic(supabase: SupabaseClient, productId: string) {
  return supabase.rpc("admin_delete_product", { p_product_id: productId });
}

export async function duplicateProductAtomic(
  supabase: SupabaseClient,
  sourceProductId: string,
) {
  return supabase.rpc("admin_duplicate_product", {
    p_product_id: sourceProductId,
  });
}

const rpcErrorMessages: Record<string, string> = {
  primary_category_required: "Изберете основна продуктова категория.",
  invalid_primary_category: "Избраната основна категория е невалидна.",
  primary_category_not_assigned:
    "Основната категория трябва да е избрана и в категориите на продукта.",
  admin_required: "Нямате администраторски права.",
  category_required: "Изберете поне една категория.",
  invalid_category: "Избрана е невалидна категория.",
  invalid_color_field: "Невалидни настройки на цветово поле.",
  invalid_color_group: "Избрана е невалидна цветова група.",
  insufficient_color_options: "Цветовото поле няма достатъчно позволени опции.",
  invalid_color_option: "Избрана е невалидна цветова опция.",
  invalid_personalization_field: "Невалидни настройки на поле за персонализация.",
  invalid_option_group: "Невалидни настройки на група опции.",
  invalid_option_value: "Невалидна стойност на опция.",
  invalid_option_dependency: "Невалидна зависимост между опции.",
  invalid_option_dependency_cycle: "Циклична зависимост между опции.",
  invalid_wish_template: "Избрано е невалидно готово пожелание.",
  product_text_required: "Името и описанието са задължителни.",
  invalid_price: "Цената е невалидна.",
  product_not_found: "Продуктът не е намерен.",
  invalid_product_slug: "SEO адресът е невалиден.",
  slug_taken: "Този SEO адрес вече се използва.",
  invalid_product_fulfillment: "Невалиден режим на наличност.",
  invalid_stock_quantity: "Складовата наличност е невалидна.",
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

  if (error?.code === "23502") {
    const columnMatch = message.match(/column "([^"]+)"/i);
    const column = columnMatch?.[1];
    if (column === "slug" || column === "product_code") {
      return "Липсва slug или продуктов код. Изпълнете product_slug_admin_rpc_hotfix.sql в Supabase и redeploy-нете последния app код.";
    }
    return column
      ? `Липсва задължителна стойност за „${column}“. (${error.code})`
      : `Липсва задължителна стойност в базата. (${error.code})`;
  }

  const knownError = Object.entries(rpcErrorMessages).find(([code]) =>
    message.includes(code),
  );
  return knownError?.[1] ?? `Неуспешна операция с продукта (${error?.code || "Supabase"}).`;
}
