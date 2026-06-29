import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  AuditCategoryRow,
  AuditDataset,
  AuditProductRow,
} from "@/lib/data-audit/types";

async function fetchAllRows<T>(
  supabase: SupabaseClient,
  table: string,
  select: string,
): Promise<{ data: T[]; error: string | null }> {
  const pageSize = 1000;
  let from = 0;
  const rows: T[] = [];

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .range(from, from + pageSize - 1);

    if (error) {
      return { data: [], error: error.message };
    }

    const batch = (data ?? []) as T[];
    rows.push(...batch);

    if (batch.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return { data: rows, error: null };
}

async function fetchOptionalRows<T>(
  supabase: SupabaseClient,
  table: string,
  select: string,
): Promise<T[] | null> {
  const result = await fetchAllRows<T>(supabase, table, select);
  if (result.error) {
    if (
      result.error.includes("does not exist") ||
      result.error.includes("Could not find the table")
    ) {
      return null;
    }

    throw new Error(`Failed to read ${table}: ${result.error}`);
  }

  return result.data;
}

export async function fetchAuditDataset(
  supabase: SupabaseClient,
): Promise<AuditDataset> {
  const [
    productsResult,
    productCategoriesResult,
    productImagesResult,
    personalizationFieldsResult,
    productWishTemplatesResult,
    wishTemplatesResult,
    categoriesResult,
  ] = await Promise.all([
    fetchAllRows(supabase, "products", "id,slug,name,subtitle,status,primary_category_id,image_url"),
    fetchAllRows(supabase, "product_categories", "product_id,category_id"),
    fetchAllRows(supabase, "product_images", "product_id"),
    fetchAllRows(
      supabase,
      "product_personalization_fields",
      "product_id,allows_wish_templates",
    ),
    fetchAllRows(supabase, "product_wish_templates", "product_id,wish_template_id"),
    fetchAllRows(supabase, "wish_templates", "id,is_active"),
    fetchAllRows(supabase, "categories", "id,slug,category_type,parent_id,is_visible"),
  ]);

  const requiredResults = [
    ["products", productsResult],
    ["product_categories", productCategoriesResult],
    ["product_images", productImagesResult],
    ["product_personalization_fields", personalizationFieldsResult],
    ["product_wish_templates", productWishTemplatesResult],
    ["wish_templates", wishTemplatesResult],
    ["categories", categoriesResult],
  ] as const;

  for (const [table, result] of requiredResults) {
    if (result.error) {
      throw new Error(`Failed to read ${table}: ${result.error}`);
    }
  }

  const [productFaqGroups, productFaqItems, faqGroups, faqItems] = await Promise.all([
    fetchOptionalRows(supabase, "product_faq_groups", "product_id,group_id"),
    fetchOptionalRows(supabase, "product_faq_items", "product_id,faq_item_id"),
    fetchOptionalRows(supabase, "faq_groups", "id"),
    fetchOptionalRows(supabase, "faq_items", "id"),
  ]);

  return {
    products: productsResult.data as AuditProductRow[],
    productCategories: productCategoriesResult.data as AuditDataset["productCategories"],
    productImages: productImagesResult.data as AuditDataset["productImages"],
    personalizationFields:
      personalizationFieldsResult.data as AuditDataset["personalizationFields"],
    productWishTemplates:
      productWishTemplatesResult.data as AuditDataset["productWishTemplates"],
    wishTemplates: wishTemplatesResult.data as AuditDataset["wishTemplates"],
    categories: categoriesResult.data as AuditCategoryRow[],
    productFaqGroups: productFaqGroups as AuditDataset["productFaqGroups"],
    productFaqItems: productFaqItems as AuditDataset["productFaqItems"],
    faqGroups: faqGroups as AuditDataset["faqGroups"],
    faqItems: faqItems as AuditDataset["faqItems"],
  };
}
