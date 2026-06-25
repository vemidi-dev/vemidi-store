import type { SupabaseClient } from "@supabase/supabase-js";

import { replaceProductFaqAssociations } from "@/lib/faq/association-rpc";

export type ProductFaqAssociationInput = {
  groupIds: string[];
  itemIds: string[];
};

export async function syncProductFaqAssociations(
  supabase: SupabaseClient,
  productId: string,
  associations: ProductFaqAssociationInput,
): Promise<string | null> {
  return replaceProductFaqAssociations(
    supabase,
    productId,
    associations.groupIds,
    associations.itemIds,
  );
}

export async function copyProductFaqAssociations(
  supabase: SupabaseClient,
  sourceProductId: string,
  targetProductId: string,
): Promise<string | null> {
  const [groupsResult, itemsResult] = await Promise.all([
    supabase
      .from("product_faq_groups")
      .select("group_id, sort_order")
      .eq("product_id", sourceProductId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("product_faq_items")
      .select("faq_item_id, sort_order")
      .eq("product_id", sourceProductId)
      .order("sort_order", { ascending: true }),
  ]);

  if (groupsResult.error || itemsResult.error) {
    return "FAQ асоциациите не бяха прочетени при дублиране.";
  }

  return replaceProductFaqAssociations(
    supabase,
    targetProductId,
    (groupsResult.data ?? []).map((row) => String(row.group_id)),
    (itemsResult.data ?? []).map((row) => String(row.faq_item_id)),
  );
}
