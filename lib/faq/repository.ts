import type { SupabaseClient } from "@supabase/supabase-js";

import {
  finalizeFaqCandidates,
  globalGroupItemSortOrder,
  mergeGlobalFaqCandidates,
  mergeProductFaqCandidates,
  productGroupItemSortOrder,
  productIndividualSortOrder,
  toActiveFaqItem,
  toFaqItemRow,
} from "@/lib/faq/resolve";
import type {
  FaqGroupItemJoinRow,
  FaqGroupRow,
  FaqItem,
  FaqItemCandidate,
  ProductFaqGroupJoinRow,
  ProductFaqItemJoinRow,
} from "@/lib/faq/types";
import { createClient } from "@/lib/supabase/server";

async function resolveClient(supabase?: SupabaseClient | null) {
  if (supabase !== undefined) {
    return supabase;
  }

  return createClient();
}

function buildGlobalCandidates(
  groups: Pick<FaqGroupRow, "id" | "sort_order">[],
  groupItems: FaqGroupItemJoinRow[],
): FaqItemCandidate[] {
  const groupSortOrderById = new Map(groups.map((group) => [group.id, group.sort_order]));
  const candidates: FaqItemCandidate[] = [];

  for (const association of groupItems) {
    const groupSortOrder = groupSortOrderById.get(association.group_id);
    if (groupSortOrder === undefined) {
      continue;
    }

    const itemRow = toActiveFaqItem(toFaqItemRow(association.faq_items));
    if (!itemRow) {
      continue;
    }

    candidates.push({
      ...itemRow,
      sortOrder: globalGroupItemSortOrder(
        groupSortOrder,
        association.sort_order,
        itemRow.sortOrder,
      ),
    });
  }

  return candidates;
}

function buildProductIndividualCandidates(
  rows: ProductFaqItemJoinRow[],
): FaqItemCandidate[] {
  const candidates: FaqItemCandidate[] = [];

  for (const association of rows) {
    const itemRow = toActiveFaqItem(toFaqItemRow(association.faq_items));
    if (!itemRow) {
      continue;
    }

    candidates.push({
      ...itemRow,
      sortOrder: productIndividualSortOrder(association.sort_order),
    });
  }

  return candidates;
}

function buildProductGroupCandidates(
  productGroups: ProductFaqGroupJoinRow[],
  groupItems: FaqGroupItemJoinRow[],
): FaqItemCandidate[] {
  const productGroupSortOrderById = new Map(
    productGroups.map((association) => [association.group_id, association.sort_order]),
  );
  const candidates: FaqItemCandidate[] = [];

  for (const association of groupItems) {
    const productGroupSortOrder = productGroupSortOrderById.get(association.group_id);
    if (productGroupSortOrder === undefined) {
      continue;
    }

    const itemRow = toActiveFaqItem(toFaqItemRow(association.faq_items));
    if (!itemRow) {
      continue;
    }

    candidates.push({
      ...itemRow,
      sortOrder: productGroupItemSortOrder(
        productGroupSortOrder,
        association.sort_order,
        itemRow.sortOrder,
      ),
    });
  }

  return candidates;
}

function isEligibleProductGroupRow(
  row: ProductFaqGroupJoinRow["faq_groups"],
): row is Pick<FaqGroupRow, "id" | "is_active" | "scope"> {
  const group = Array.isArray(row) ? row[0] : row;
  return Boolean(group?.is_active && group.scope === "product");
}

export async function getGlobalFaqItems(
  supabase?: SupabaseClient | null,
): Promise<FaqItem[]> {
  const client = await resolveClient(supabase);
  if (!client) {
    return [];
  }

  const { data: groups, error: groupsError } = await client
    .from("faq_groups")
    .select("id, sort_order")
    .eq("scope", "global")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  if (groupsError || !groups?.length) {
    return groupsError ? [] : [];
  }

  const groupIds = groups.map((group) => group.id);
  const { data: groupItems, error: groupItemsError } = await client
    .from("faq_group_items")
    .select("group_id, sort_order, faq_items(id, question, answer, is_active, sort_order)")
    .in("group_id", groupIds)
    .order("sort_order", { ascending: true });

  if (groupItemsError) {
    return [];
  }

  return mergeGlobalFaqCandidates(
    buildGlobalCandidates(
      groups as Pick<FaqGroupRow, "id" | "sort_order">[],
      (groupItems ?? []) as FaqGroupItemJoinRow[],
    ),
  );
}

export async function getProductFaqItems(
  productId: string,
  supabase?: SupabaseClient | null,
): Promise<FaqItem[]> {
  const client = await resolveClient(supabase);
  if (!client || !productId.trim()) {
    return [];
  }

  const [
    { data: productItems, error: productItemsError },
    { data: productGroups, error: productGroupsError },
  ] = await Promise.all([
    client
      .from("product_faq_items")
      .select("sort_order, faq_items(id, question, answer, is_active, sort_order)")
      .eq("product_id", productId)
      .order("sort_order", { ascending: true }),
    client
      .from("product_faq_groups")
      .select("group_id, sort_order, faq_groups(id, is_active, scope)")
      .eq("product_id", productId)
      .order("sort_order", { ascending: true }),
  ]);

  if (productItemsError || productGroupsError) {
    return [];
  }

  const individualCandidates = buildProductIndividualCandidates(
    (productItems ?? []) as ProductFaqItemJoinRow[],
  );

  const activeProductGroups = ((productGroups ?? []) as ProductFaqGroupJoinRow[]).filter(
    (association) => isEligibleProductGroupRow(association.faq_groups),
  );

  if (!activeProductGroups.length) {
    return mergeProductFaqCandidates(individualCandidates, []);
  }

  const groupIds = activeProductGroups.map((association) => association.group_id);
  const { data: groupItems, error: groupItemsError } = await client
    .from("faq_group_items")
    .select("group_id, sort_order, faq_items(id, question, answer, is_active, sort_order)")
    .in("group_id", groupIds)
    .order("sort_order", { ascending: true });

  if (groupItemsError) {
    return finalizeFaqCandidates(individualCandidates);
  }

  return mergeProductFaqCandidates(
    individualCandidates,
    buildProductGroupCandidates(
      activeProductGroups,
      (groupItems ?? []) as FaqGroupItemJoinRow[],
    ),
  );
}
