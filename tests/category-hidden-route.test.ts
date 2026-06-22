import assert from "node:assert/strict";
import test from "node:test";

import {
  findVisibleOccasionCategoryBySlug,
  findVisibleProductCategoryBySlug,
} from "@/lib/category-visibility";
import type { StorefrontCategory } from "@/lib/storefront/types";

const hiddenProduct: StorefrontCategory = {
  id: "product-hidden",
  name: "Скрита продуктова",
  slug: "skrita-produktova",
  category_type: "product",
  parent_id: null,
  show_on_home: false,
  is_visible: false,
  home_sort_order: 1,
  card_description: null,
  createdAt: null,
};

const hiddenOccasion: StorefrontCategory = {
  id: "occasion-hidden",
  name: "Скрит повод",
  slug: "skrit-povod",
  category_type: "occasion",
  parent_id: null,
  show_on_home: false,
  is_visible: false,
  home_sort_order: 1,
  card_description: null,
  createdAt: null,
};

test("direct hidden product category slug resolves to null for storefront page lookup", () => {
  const categories = [hiddenProduct];
  assert.equal(findVisibleProductCategoryBySlug(categories, "skrita-produktova"), null);
});

test("direct hidden occasion slug resolves to null for storefront page lookup", () => {
  const categories = [hiddenOccasion];
  assert.equal(findVisibleOccasionCategoryBySlug(categories, "skrit-povod"), null);
});
