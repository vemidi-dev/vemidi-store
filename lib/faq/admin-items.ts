import type { SupabaseClient } from "@supabase/supabase-js";

export function normalizeFaqQuestion(question: string): string {
  return question.trim().toLowerCase();
}

export function findFaqItemByNormalizedQuestion<
  T extends { id: string; question: string },
>(items: T[], question: string): T | null {
  const normalized = normalizeFaqQuestion(question);
  return items.find((item) => normalizeFaqQuestion(item.question) === normalized) ?? null;
}

export async function fetchFaqItemByNormalizedQuestion(
  supabase: SupabaseClient,
  question: string,
): Promise<{ id: string; question: string } | null> {
  const { data, error } = await supabase.from("faq_items").select("id, question");

  if (error || !data) {
    return null;
  }

  return findFaqItemByNormalizedQuestion(data, question);
}

export async function linkFaqItemToGroup(
  supabase: SupabaseClient,
  groupId: string,
  itemId: string,
  sortOrder?: number,
): Promise<"linked" | "already_linked" | "error"> {
  const { data: existing } = await supabase
    .from("faq_group_items")
    .select("group_id")
    .eq("group_id", groupId)
    .eq("faq_item_id", itemId)
    .maybeSingle();

  if (existing) {
    return "already_linked";
  }

  let resolvedSortOrder = sortOrder;
  if (resolvedSortOrder === undefined) {
    const { data: lastLink } = await supabase
      .from("faq_group_items")
      .select("sort_order")
      .eq("group_id", groupId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    resolvedSortOrder = (Number(lastLink?.sort_order) || 0) + 10;
  }

  const { error } = await supabase.from("faq_group_items").insert({
    group_id: groupId,
    faq_item_id: itemId,
    sort_order: resolvedSortOrder,
  });

  if (error) {
    const message = error.message ?? "";
    if (
      message.includes("faq_group_items_pkey") ||
      message.includes("duplicate key value")
    ) {
      return "already_linked";
    }
    return "error";
  }

  return "linked";
}
