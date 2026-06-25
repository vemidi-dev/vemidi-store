import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

const RPC_ERROR_MESSAGES: Record<string, string> = {
  product_not_found: "Продуктът не е намерен.",
  invalid_product_faq_group:
    "Само активни продуктови FAQ групи могат да се свързват с продукт.",
  invalid_faq_item: "Избран е невалиден FAQ въпрос.",
  invalid_faq_group: "FAQ групата не е намерена.",
  duplicate_product_faq_group: "Дублирана FAQ група в заявката.",
  duplicate_product_faq_item: "Дублиран FAQ въпрос в заявката.",
  duplicate_faq_group_item: "Дублиран FAQ въпрос в заявката.",
  admin_required: "Нямате администраторски права.",
};

export function getFaqAssociationRpcErrorMessage(
  error: Pick<PostgrestError, "code" | "message" | "details" | "hint"> | null | undefined,
): string {
  const message = [error?.message, error?.details, error?.hint].filter(Boolean).join(" ");

  if (!message) {
    return "FAQ асоциациите не бяха запазени.";
  }

  if (message.includes("Could not find the function")) {
    return "Липсва Supabase миграцията faq_admin_association_rpcs.sql. Изпълнете я в Supabase.";
  }

  for (const [code, text] of Object.entries(RPC_ERROR_MESSAGES)) {
    if (message.includes(code)) {
      return text;
    }
  }

  if (error?.code === "42501" || message.toLowerCase().includes("permission denied")) {
    return "Нямате администраторски права за FAQ асоциации.";
  }

  return "FAQ асоциациите не бяха запазени.";
}

export async function replaceProductFaqAssociations(
  supabase: SupabaseClient,
  productId: string,
  groupIds: string[],
  itemIds: string[],
): Promise<string | null> {
  const { error } = await supabase.rpc("replace_product_faq_associations", {
    p_product_id: productId,
    p_group_ids: groupIds,
    p_item_ids: itemIds,
  });

  return error ? getFaqAssociationRpcErrorMessage(error) : null;
}

export async function replaceFaqGroupItems(
  supabase: SupabaseClient,
  groupId: string,
  itemIds: string[],
): Promise<string | null> {
  const { error } = await supabase.rpc("replace_faq_group_items", {
    p_group_id: groupId,
    p_item_ids: itemIds,
  });

  return error ? getFaqAssociationRpcErrorMessage(error) : null;
}
