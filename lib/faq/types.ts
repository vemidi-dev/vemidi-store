export type FaqGroupScope = "global" | "product";

export type FaqGroupRow = {
  id: string;
  name: string;
  slug: string;
  scope: FaqGroupScope;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type FaqItemRow = {
  id: string;
  question: string;
  answer: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type FaqGroupItemRow = {
  group_id: string;
  faq_item_id: string;
  sort_order: number;
  created_at: string;
};

export type ProductFaqGroupRow = {
  product_id: string;
  group_id: string;
  sort_order: number;
  created_at: string;
};

export type ProductFaqItemRow = {
  product_id: string;
  faq_item_id: string;
  sort_order: number;
  created_at: string;
};

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
};

export type FaqItemCandidate = {
  faqItemId: string;
  question: string;
  answer: string;
  sortOrder: number;
};

export type FaqGroupItemJoinRow = {
  group_id: string;
  sort_order: number;
  faq_items: FaqItemRow | FaqItemRow[] | null;
};

export type ProductFaqItemJoinRow = {
  sort_order: number;
  faq_items: FaqItemRow | FaqItemRow[] | null;
};

export type ProductFaqGroupJoinRow = {
  group_id: string;
  sort_order: number;
  faq_groups: Pick<FaqGroupRow, "id" | "is_active" | "scope"> | Pick<
    FaqGroupRow,
    "id" | "is_active" | "scope"
  >[] | null;
};
