import assert from "node:assert/strict";
import test from "node:test";

import {
  filterWishTemplates,
  getWishOccasionIds,
  sortWishTemplates,
  truncateWishBody,
} from "@/lib/wish-admin";
import type { WishTemplateOccasionRow, WishTemplateRow } from "@/lib/admin/types";

const wishes: WishTemplateRow[] = [
  {
    id: "w1",
    title: "Честит рожден ден",
    body: "Честит рожден ден и много здраве!",
    is_active: true,
    sort_order: 1,
  },
  {
    id: "w2",
    title: "За сватба",
    body: "Пожелавам ви щастлива сватба.",
    is_active: false,
    sort_order: 2,
  },
  {
    id: "w3",
    title: "Без повод",
    body: "Универсално пожелание за всеки.",
    is_active: true,
    sort_order: 3,
  },
];

const links: WishTemplateOccasionRow[] = [
  { wish_template_id: "w1", category_id: "birthday" },
  { wish_template_id: "w2", category_id: "wedding" },
];

test("wish occasion links resolve per template", () => {
  assert.deepEqual(getWishOccasionIds("w1", links), ["birthday"]);
  assert.deepEqual(getWishOccasionIds("w3", links), []);
});

test("wish filters combine search, occasion and active status", () => {
  assert.deepEqual(
    filterWishTemplates(wishes, links, {
      search: "сватба",
      occasion: "all",
      active: "all",
    }).map((wish) => wish.id),
    ["w2"],
  );

  assert.deepEqual(
    filterWishTemplates(wishes, links, {
      search: "",
      occasion: "birthday",
      active: "all",
    }).map((wish) => wish.id),
    ["w1"],
  );

  assert.deepEqual(
    filterWishTemplates(wishes, links, {
      search: "",
      occasion: "unassigned",
      active: "all",
    }).map((wish) => wish.id),
    ["w3"],
  );

  assert.deepEqual(
    filterWishTemplates(wishes, links, {
      search: "",
      occasion: "all",
      active: "inactive",
    }).map((wish) => wish.id),
    ["w2"],
  );
});

test("wish body truncation keeps readable preview text", () => {
  const longBody = "А".repeat(140);
  assert.equal(truncateWishBody(longBody, 120).endsWith("…"), true);
  assert.equal(truncateWishBody("Кратко"), "Кратко");
});

test("wish sort respects configured order", () => {
  const sorted = sortWishTemplates(wishes, "order-desc");
  assert.deepEqual(
    sorted.map((wish) => wish.id),
    ["w3", "w2", "w1"],
  );
});
