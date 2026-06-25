import type { FaqItem, FaqItemCandidate, FaqItemRow } from "@/lib/faq/types";

export const PRODUCT_INDIVIDUAL_FAQ_SORT_BASE = 0;
export const PRODUCT_GROUP_FAQ_SORT_BASE = 1_000_000;

export function toFaqItemRow(value: FaqItemRow | FaqItemRow[] | null | undefined) {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function toActiveFaqItem(row: FaqItemRow | null): FaqItemCandidate | null {
  if (!row || !row.is_active) {
    return null;
  }

  const question = row.question.trim();
  const answer = row.answer.trim();
  if (!question || !answer) {
    return null;
  }

  return {
    faqItemId: row.id,
    question,
    answer,
    sortOrder: row.sort_order,
  };
}

export function productIndividualSortOrder(associationSortOrder: number) {
  return PRODUCT_INDIVIDUAL_FAQ_SORT_BASE + associationSortOrder;
}

export function productGroupItemSortOrder(
  productGroupSortOrder: number,
  groupItemSortOrder: number,
  itemSortOrder: number,
) {
  return (
    PRODUCT_GROUP_FAQ_SORT_BASE +
    productGroupSortOrder * 10_000 +
    groupItemSortOrder * 100 +
    itemSortOrder
  );
}

export function globalGroupItemSortOrder(
  groupSortOrder: number,
  groupItemSortOrder: number,
  itemSortOrder: number,
) {
  return groupSortOrder * 10_000 + groupItemSortOrder * 100 + itemSortOrder;
}

export function finalizeFaqCandidates(candidates: FaqItemCandidate[]): FaqItem[] {
  const seen = new Set<string>();
  const sorted = [...candidates].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }

    return left.question.localeCompare(right.question, "bg");
  });

  const items: FaqItem[] = [];
  for (const candidate of sorted) {
    if (seen.has(candidate.faqItemId)) {
      continue;
    }

    seen.add(candidate.faqItemId);
    items.push({
      id: candidate.faqItemId,
      question: candidate.question,
      answer: candidate.answer,
      sortOrder: candidate.sortOrder,
    });
  }

  return items;
}

export function mergeProductFaqCandidates(
  individual: FaqItemCandidate[],
  fromGroups: FaqItemCandidate[],
): FaqItem[] {
  return finalizeFaqCandidates([...individual, ...fromGroups]);
}

export function mergeGlobalFaqCandidates(candidates: FaqItemCandidate[]): FaqItem[] {
  return finalizeFaqCandidates(candidates);
}
