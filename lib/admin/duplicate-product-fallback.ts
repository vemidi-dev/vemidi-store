import type { SupabaseClient } from "@supabase/supabase-js";

import { buildDuplicateProductName } from "@/lib/admin/duplicate-product";
import {
  createProductAtomic,
  getProductMutationErrorMessage,
  type ProductMutationInput,
} from "@/lib/admin/product-rpc";
import type {
  ParsedColorField,
  ParsedOptionGroup,
  ParsedPersonalizationField,
  ProductColorFieldOptionRow,
  ProductColorFieldRow,
  ProductOptionGroupRow,
  ProductOptionValueRow,
  ProductPersonalizationFieldRow,
  ProductRow,
  ProductWishTemplateRow,
} from "@/lib/admin/types";
import type { ProductFulfillmentType } from "@/lib/product-fulfillment";
import {
  slugifyProductName,
  suggestDuplicateProductSlug,
  uniquifyProductSlug,
} from "@/lib/product-slug";

type ProductCategoryLink = {
  category_id: string;
};

function normalizeString(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeNullableString(value: unknown) {
  const text = normalizeString(value);
  return text || null;
}

function normalizeFulfillmentType(value: unknown): ProductFulfillmentType {
  return value === "stocked" ? "stocked" : "made_to_order";
}

function normalizeOptionInputType(
  value: unknown,
): ParsedOptionGroup["inputType"] {
  const normalized = normalizeString(value);
  return normalized === "multiple" ||
    normalized === "text" ||
    normalized === "textarea" ||
    normalized === "date"
    ? normalized
    : "single";
}

function normalizeImageDisplaySize(
  value: unknown,
): ParsedOptionGroup["imageDisplaySize"] {
  const normalized = normalizeString(value);
  return normalized === "small" || normalized === "large" ? normalized : "medium";
}

function normalizePersonalizationType(
  value: unknown,
): ParsedPersonalizationField["type"] {
  const normalized = normalizeString(value);
  return normalized === "textarea" || normalized === "date" ? normalized : "text";
}

async function resolveDuplicateSlug(
  supabase: SupabaseClient,
  source: Pick<ProductRow, "name" | "slug">,
) {
  const sourceSlug = normalizeString(source.slug) || slugifyProductName(source.name);
  const duplicateBase = suggestDuplicateProductSlug(sourceSlug || source.name);
  const { data } = await supabase.from("products").select("slug");
  const takenSlugs = new Set(
    (data ?? [])
      .map((row) => normalizeString((row as { slug?: unknown }).slug).toLowerCase())
      .filter(Boolean),
  );

  return uniquifyProductSlug(duplicateBase, takenSlugs);
}

function mapColorFields(
  fields: ProductColorFieldRow[],
  fieldOptions: ProductColorFieldOptionRow[],
): ParsedColorField[] {
  const optionsByFieldId = new Map<string, string[]>();
  for (const option of fieldOptions) {
    const options = optionsByFieldId.get(option.field_id) ?? [];
    options.push(option.color_option_id);
    optionsByFieldId.set(option.field_id, options);
  }

  return fields.map((field, index) => {
    const selectionMode = field.selection_mode === "quantity" ? "quantity" : "choice";
    return {
      label: field.label,
      groupId: field.group_id,
      minSelect: Number(field.min_select ?? 0),
      maxSelect: Number(field.max_select ?? 1),
      optionIds: [...new Set(optionsByFieldId.get(field.id) ?? [])],
      sortOrder: Number(field.sort_order ?? index),
      selectionMode,
      requiredTotalQuantity:
        selectionMode === "quantity" && field.required_total_quantity != null
          ? Number(field.required_total_quantity)
          : null,
    };
  });
}

function mapPersonalizationFields(
  fields: ProductPersonalizationFieldRow[],
): ParsedPersonalizationField[] {
  return fields.map((field, index) => ({
    label: field.label,
    key: field.field_key,
    type: normalizePersonalizationType(field.field_type),
    placeholder: field.placeholder ?? "",
    maxLength: Number(field.max_length ?? 120),
    priceDelta: Number(field.price_delta ?? 0),
    required: Boolean(field.is_required),
    allowsWishTemplates: Boolean(field.allows_wish_templates),
    sortOrder: Number(field.sort_order ?? index),
  }));
}

function mapOptionGroups(
  groups: ProductOptionGroupRow[],
  values: ProductOptionValueRow[],
): ParsedOptionGroup[] {
  const valuesByGroupId = new Map<string, ProductOptionValueRow[]>();
  for (const value of values) {
    const groupValues = valuesByGroupId.get(value.group_id) ?? [];
    groupValues.push(value);
    valuesByGroupId.set(value.group_id, groupValues);
  }

  return groups.map((group, index) => ({
    id: group.id,
    name: group.name,
    key: group.key,
    inputType: normalizeOptionInputType(group.input_type),
    imageDisplaySize: normalizeImageDisplaySize(group.image_display_size),
    isRequired: Boolean(group.is_required),
    minSelect: Number(group.min_select ?? 0),
    maxSelect: Number(group.max_select ?? 1),
    sortOrder: Number(group.sort_order ?? index),
    isActive: Boolean(group.is_active),
    pricingMode: "delta",
    dependsOnOptionId: group.depends_on_option_id,
    placeholder: group.placeholder,
    maxLength: group.max_length == null ? null : Number(group.max_length),
    textPriceDelta: Number(group.text_price_delta ?? 0),
    values: (valuesByGroupId.get(group.id) ?? []).map((value, valueIndex) => ({
      id: value.id,
      label: value.label,
      key: value.key,
      priceDelta: Number(value.price_delta ?? 0),
      isDefault: Boolean(value.is_default),
      isActive: Boolean(value.is_active),
      isSoldOut: Boolean(value.is_sold_out),
      imageUrl: value.image_url,
      materialId: value.material_id ?? null,
      sku: value.sku,
      sortOrder: Number(value.sort_order ?? valueIndex),
    })),
  }));
}

async function loadOptionGroupsWithOptionalImageSize(
  supabase: SupabaseClient,
  productId: string,
) {
  const full = await supabase
    .from("product_option_groups")
    .select(
      "id,product_id,name,key,input_type,is_required,min_select,max_select,sort_order,is_active,pricing_mode,depends_on_option_id,placeholder,max_length,text_price_delta,image_display_size",
    )
    .eq("product_id", productId)
    .order("sort_order", { ascending: true });

  if (!full.error) {
    return full;
  }

  return supabase
    .from("product_option_groups")
    .select(
      "id,product_id,name,key,input_type,is_required,min_select,max_select,sort_order,is_active,pricing_mode,depends_on_option_id,placeholder,max_length,text_price_delta",
    )
    .eq("product_id", productId)
    .order("sort_order", { ascending: true });
}

async function buildDuplicateMutationInput(
  supabase: SupabaseClient,
  sourceProductId: string,
): Promise<
  | {
      ok: true;
      input: ProductMutationInput;
      postCreate: {
        visibility: string;
        showQuantitySelector: boolean;
        quantityPriceTiers: unknown;
        personalizationOpenByDefault: boolean | null;
      };
    }
  | { ok: false; message: string }
> {
  const [
    sourceResult,
    categoriesResult,
    colorFieldsResult,
    personalizationResult,
    wishesResult,
    optionGroupsResult,
  ] = await Promise.all([
    supabase.from("products").select("*").eq("id", sourceProductId).maybeSingle(),
    supabase
      .from("product_categories")
      .select("category_id")
      .eq("product_id", sourceProductId),
    supabase
      .from("product_color_fields")
      .select(
        "id,product_id,group_id,label,enabled,min_select,max_select,sort_order,selection_mode,required_total_quantity",
      )
      .eq("product_id", sourceProductId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("product_personalization_fields")
      .select(
        "id,product_id,label,field_key,field_type,placeholder,max_length,price_delta,is_required,allows_wish_templates,sort_order",
      )
      .eq("product_id", sourceProductId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("product_wish_templates")
      .select("product_id,wish_template_id,sort_order")
      .eq("product_id", sourceProductId)
      .order("sort_order", { ascending: true }),
    loadOptionGroupsWithOptionalImageSize(supabase, sourceProductId),
  ]);

  if (sourceResult.error) {
    return { ok: false, message: sourceResult.error.message };
  }
  if (!sourceResult.data) {
    return { ok: false, message: "Продуктът не беше намерен." };
  }

  const firstChildError =
    categoriesResult.error ||
    colorFieldsResult.error ||
    personalizationResult.error ||
    wishesResult.error ||
    optionGroupsResult.error;
  if (firstChildError) {
    return { ok: false, message: firstChildError.message };
  }

  const source = sourceResult.data as ProductRow;
  const colorFields = (colorFieldsResult.data ?? []) as ProductColorFieldRow[];
  const fieldIds = colorFields.map((field) => field.id);
  const colorFieldOptionsResult =
    fieldIds.length > 0
      ? await supabase
          .from("product_color_field_options")
          .select("field_id,color_option_id")
          .in("field_id", fieldIds)
      : { data: [], error: null };

  if (colorFieldOptionsResult.error) {
    return { ok: false, message: colorFieldOptionsResult.error.message };
  }

  const optionGroups = (optionGroupsResult.data ?? []) as ProductOptionGroupRow[];
  const groupIds = optionGroups.map((group) => group.id);
  const optionValuesResult =
    groupIds.length > 0
      ? await supabase
          .from("product_option_values")
          .select(
            "id,group_id,label,key,price_delta,is_default,is_active,is_sold_out,image_url,material_id,sku,sort_order",
          )
          .in("group_id", groupIds)
          .order("sort_order", { ascending: true })
      : { data: [], error: null };

  if (optionValuesResult.error) {
    return { ok: false, message: optionValuesResult.error.message };
  }

  const fulfillmentType = normalizeFulfillmentType(source.fulfillment_type);
  const categoryIds = [
    ...new Set(
      ((categoriesResult.data ?? []) as ProductCategoryLink[]).map(
        (link) => link.category_id,
      ),
    ),
  ];
  const primaryCategoryId = source.primary_category_id ?? null;

  return {
    ok: true,
    input: {
      name: buildDuplicateProductName(source.name),
      slug: await resolveDuplicateSlug(supabase, source),
      subtitle: normalizeNullableString(source.subtitle),
      headingSubtitle: normalizeNullableString(source.heading_subtitle),
      description: normalizeString(source.description),
      additionalInfo: normalizeNullableString(source.additional_info),
      personalizationInfo: normalizeNullableString(source.personalization_info),
      dimensionsMaterials: normalizeNullableString(source.dimensions_materials),
      orderingInfo: normalizeNullableString(source.ordering_info),
      fulfillmentNote: normalizeNullableString(source.fulfillment_note),
      price: Number(source.price ?? 0),
      imageUrl: null,
      isCustomizable: Boolean(source.is_customizable),
      isSoldOut: false,
      fulfillmentType,
      stockQuantity: fulfillmentType === "stocked" ? 0 : null,
      cardBadge: normalizeNullableString(source.card_badge),
      categoryIds,
      primaryCategoryId,
      colorFields: mapColorFields(
        colorFields,
        (colorFieldOptionsResult.data ?? []) as ProductColorFieldOptionRow[],
      ),
      personalizationFields: mapPersonalizationFields(
        (personalizationResult.data ?? []) as ProductPersonalizationFieldRow[],
      ),
      wishTemplateIds: [
        ...new Set(
          ((wishesResult.data ?? []) as ProductWishTemplateRow[]).map(
            (link) => link.wish_template_id,
          ),
        ),
      ],
      optionGroups: mapOptionGroups(
        optionGroups,
        (optionValuesResult.data ?? []) as ProductOptionValueRow[],
      ),
      metaTitle: null,
      metaDescription: null,
      ogTitle: null,
      ogDescription: null,
    },
    postCreate: {
      visibility: normalizeString(source.visibility) || "public",
      showQuantitySelector: Boolean(source.show_quantity_selector),
      quantityPriceTiers: source.quantity_price_tiers ?? null,
      personalizationOpenByDefault:
        typeof source.personalization_open_by_default === "boolean"
          ? source.personalization_open_by_default
          : null,
    },
  };
}

export async function duplicateProductWithCreateFallback(
  supabase: SupabaseClient,
  sourceProductId: string,
) {
  const prepared = await buildDuplicateMutationInput(supabase, sourceProductId);
  if (!prepared.ok) {
    return { data: null, error: prepared.message };
  }

  const { data: newProductId, error: createError } = await createProductAtomic(
    supabase,
    prepared.input,
  );
  if (createError || !newProductId) {
    return { data: null, error: getProductMutationErrorMessage(createError) };
  }

  const newId = String(newProductId);
  const { error: updateError } = await supabase
    .from("products")
    .update({
      status: "draft",
      visibility: prepared.postCreate.visibility,
      show_quantity_selector: prepared.postCreate.showQuantitySelector,
      quantity_price_tiers: prepared.postCreate.quantityPriceTiers,
      personalization_open_by_default:
        prepared.postCreate.personalizationOpenByDefault,
    })
    .eq("id", newId);

  if (updateError) {
    return {
      data: newId,
      error: "Продуктът е дублиран, но статусът не беше зададен като чернова.",
    };
  }

  return { data: newId, error: null };
}
