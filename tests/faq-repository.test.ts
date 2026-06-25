import assert from "node:assert/strict";
import test from "node:test";

import {
  finalizeFaqCandidates,
  globalGroupItemSortOrder,
  mergeGlobalFaqCandidates,
  mergeProductFaqCandidates,
  productGroupItemSortOrder,
  productIndividualSortOrder,
  toActiveFaqItem,
} from "@/lib/faq/resolve";
import { getGlobalFaqItems, getProductFaqItems } from "@/lib/faq/repository";
import type { FaqGroupItemJoinRow, FaqItemRow, ProductFaqItemJoinRow } from "@/lib/faq/types";

function faqItemRow(overrides: Partial<FaqItemRow> = {}): FaqItemRow {
  return {
    id: "item-1",
    question: "Колко време отнема изработката?",
    answer: "Обикновено 1–5 работни дни.",
    is_active: true,
    sort_order: 0,
    created_at: "2026-06-25T00:00:00.000Z",
    updated_at: "2026-06-25T00:00:00.000Z",
    ...overrides,
  };
}

test("mergeGlobalFaqCandidates keeps global group order and deduplicates items", () => {
  const items = mergeGlobalFaqCandidates([
    {
      faqItemId: "shared",
      question: "Споделен въпрос",
      answer: "От група 2",
      sortOrder: globalGroupItemSortOrder(2, 0, 0),
    },
    {
      faqItemId: "shared",
      question: "Споделен въпрос",
      answer: "От група 1",
      sortOrder: globalGroupItemSortOrder(1, 0, 0),
    },
    {
      faqItemId: "unique",
      question: "Уникален въпрос",
      answer: "Само в група 1",
      sortOrder: globalGroupItemSortOrder(1, 1, 0),
    },
  ]);

  assert.deepEqual(
    items.map((item) => item.id),
    ["shared", "unique"],
  );
  assert.equal(items[0]?.answer, "От група 1");
});

test("mergeProductFaqCandidates prioritizes individual items before group items", () => {
  const items = mergeProductFaqCandidates(
    [
      {
        faqItemId: "individual",
        question: "Индивидуален",
        answer: "Само за продукта",
        sortOrder: productIndividualSortOrder(1),
      },
    ],
    [
      {
        faqItemId: "group-item",
        question: "Групов",
        answer: "От група",
        sortOrder: productGroupItemSortOrder(0, 0, 0),
      },
    ],
  );

  assert.deepEqual(
    items.map((item) => item.id),
    ["individual", "group-item"],
  );
});

test("mergeProductFaqCandidates deduplicates group duplicates in favor of individual order", () => {
  const items = mergeProductFaqCandidates(
    [
      {
        faqItemId: "shared",
        question: "Споделен",
        answer: "Индивидуален отговор",
        sortOrder: productIndividualSortOrder(0),
      },
    ],
    [
      {
        faqItemId: "shared",
        question: "Споделен",
        answer: "Групов отговор",
        sortOrder: productGroupItemSortOrder(0, 0, 0),
      },
    ],
  );

  assert.equal(items.length, 1);
  assert.equal(items[0]?.answer, "Индивидуален отговор");
});

test("toActiveFaqItem ignores inactive or empty records", () => {
  assert.equal(toActiveFaqItem(faqItemRow({ is_active: false })), null);
  assert.equal(toActiveFaqItem(faqItemRow({ question: "   " })), null);
  assert.equal(toActiveFaqItem(faqItemRow({ answer: "" })), null);
});

test("finalizeFaqCandidates sorts by sortOrder then question", () => {
  const items = finalizeFaqCandidates([
    {
      faqItemId: "b",
      question: "Бърз въпрос",
      answer: "Отговор B",
      sortOrder: 2,
    },
    {
      faqItemId: "a",
      question: "Азбучен въпрос",
      answer: "Отговор A",
      sortOrder: 1,
    },
  ]);

  assert.deepEqual(
    items.map((item) => item.id),
    ["a", "b"],
  );
});

test("getGlobalFaqItems returns empty array when supabase is unavailable", async () => {
  assert.deepEqual(await getGlobalFaqItems(null), []);
});

test("getGlobalFaqItems tolerates query failures", async () => {
  const supabase = {
    from() {
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        order() {
          return this;
        },
        then(resolve: (value: unknown) => void) {
          resolve({
            data: null,
            error: { message: "connection failed", code: "08006" },
          });
        },
      };
    },
  };

  assert.deepEqual(await getGlobalFaqItems(supabase as never), []);
});

test("getProductFaqItems combines individual and group FAQ with inactive filtering", async () => {
  const productId = "prod-1";
  const supabase = createProductFaqSupabaseMock(productId, {
    productItems: [
      {
        sort_order: 0,
        faq_items: faqItemRow({
          id: "individual",
          question: "Индивидуален въпрос",
          answer: "Индивидуален отговор",
        }),
      },
      {
        sort_order: 1,
        faq_items: faqItemRow({
          id: "inactive",
          question: "Неактивен",
          answer: "Скрит",
          is_active: false,
        }),
      },
    ] satisfies ProductFaqItemJoinRow[],
    productGroups: [
      {
        group_id: "group-1",
        sort_order: 0,
        faq_groups: { id: "group-1", is_active: true, scope: "product" },
      },
      {
        group_id: "group-inactive",
        sort_order: 1,
        faq_groups: { id: "group-inactive", is_active: false, scope: "product" },
      },
    ],
    groupItems: [
      {
        group_id: "group-1",
        sort_order: 0,
        faq_items: faqItemRow({
          id: "group-item",
          question: "Групов въпрос",
          answer: "Групов отговор",
        }),
      },
      {
        group_id: "group-1",
        sort_order: 1,
        faq_items: faqItemRow({
          id: "individual",
          question: "Индивидуален въпрос",
          answer: "Дублиран в група",
        }),
      },
    ] satisfies FaqGroupItemJoinRow[],
  });

  const items = await getProductFaqItems(productId, supabase as never);

  assert.deepEqual(
    items.map((item) => item.id),
    ["individual", "group-item"],
  );
  assert.equal(items[0]?.answer, "Индивидуален отговор");
});

test("getProductFaqItems ignores active global groups linked to a product", async () => {
  const productId = "prod-1";
  const supabase = createProductFaqSupabaseMock(productId, {
    productItems: [],
    productGroups: [
      {
        group_id: "global-group",
        sort_order: 0,
        faq_groups: { id: "global-group", is_active: true, scope: "global" },
      },
      {
        group_id: "product-group",
        sort_order: 1,
        faq_groups: { id: "product-group", is_active: true, scope: "product" },
      },
    ],
    groupItems: [
      {
        group_id: "global-group",
        sort_order: 0,
        faq_items: faqItemRow({
          id: "global-item",
          question: "Глобален въпрос",
          answer: "Не трябва на продукт",
        }),
      },
      {
        group_id: "product-group",
        sort_order: 0,
        faq_items: faqItemRow({
          id: "product-group-item",
          question: "Продуктов групов въпрос",
          answer: "Показва се",
        }),
      },
    ] satisfies FaqGroupItemJoinRow[],
  });

  const items = await getProductFaqItems(productId, supabase as never);

  assert.deepEqual(
    items.map((item) => item.id),
    ["product-group-item"],
  );
});

function createProductFaqSupabaseMock(
  productId: string,
  fixtures: {
    productItems: ProductFaqItemJoinRow[];
    productGroups: Array<{
      group_id: string;
      sort_order: number;
      faq_groups: { id: string; is_active: boolean; scope: "product" | "global" };
    }>;
    groupItems: FaqGroupItemJoinRow[];
  },
) {
  return {
    from(table: string) {
      const query = {
        filters: [] as Array<{ column: string; value: string }>,
        select() {
          return this;
        },
        eq(column: string, value: string) {
          this.filters.push({ column, value });
          return this;
        },
        in(column: string, values: string[]) {
          this.filters.push({ column, value: values.join(",") });
          return this;
        },
        order() {
          return this;
        },
        then(resolve: (value: unknown) => void) {
          if (table === "product_faq_items") {
            resolve({ data: fixtures.productItems, error: null });
            return;
          }

          if (table === "product_faq_groups") {
            resolve({ data: fixtures.productGroups, error: null });
            return;
          }

          if (table === "faq_group_items") {
            const groupFilter = query.filters.find((filter) => filter.column === "group_id");
            const allowedGroupIds = new Set(groupFilter?.value.split(",") ?? []);
            resolve({
              data: fixtures.groupItems.filter((row) => allowedGroupIds.has(row.group_id)),
              error: null,
            });
            return;
          }

          resolve({ data: [], error: null });
        },
      };

      void productId;
      return query;
    },
  };
}
