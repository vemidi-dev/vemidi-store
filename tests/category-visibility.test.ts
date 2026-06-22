import assert from "node:assert/strict";
import test from "node:test";

import {
  filterStorefrontVisibleCategories,
  findVisibleProductCategoryBySlug,
  isCategoryStorefrontVisible,
  buildCategoryVisibilityIndex,
} from "@/lib/category-visibility";
import type { StorefrontCategory } from "@/lib/storefront/types";

function category(
  overrides: Partial<StorefrontCategory> & Pick<StorefrontCategory, "id" | "slug">,
): StorefrontCategory {
  return {
    name: overrides.slug,
    category_type: "product",
    parent_id: null,
    show_on_home: true,
    home_sort_order: 0,
    card_description: null,
    createdAt: null,
    ...overrides,
  };
}

test("filterStorefrontVisibleCategories excludes hidden categories", () => {
  const categories = [
    category({ id: "visible", slug: "visible", is_visible: true }),
    category({ id: "hidden", slug: "hidden", is_visible: false }),
  ];

  const visible = filterStorefrontVisibleCategories(categories);
  assert.deepEqual(
    visible.map((entry) => entry.slug),
    ["visible"],
  );
});

test("hidden parent hides visible child from storefront lists", () => {
  const categories = [
    category({ id: "parent", slug: "parent", is_visible: false }),
    category({
      id: "child",
      slug: "child",
      parent_id: "parent",
      is_visible: true,
    }),
  ];
  const index = buildCategoryVisibilityIndex(categories);

  assert.equal(isCategoryStorefrontVisible(categories[1], index), false);
  assert.equal(findVisibleProductCategoryBySlug(categories, "child"), null);
});

test("findVisibleProductCategoryBySlug returns visible category", () => {
  const categories = [category({ id: "cat-1", slug: "bijuta", is_visible: true })];

  assert.equal(findVisibleProductCategoryBySlug(categories, "bijuta")?.slug, "bijuta");
  assert.equal(findVisibleProductCategoryBySlug(categories, "missing"), null);
});
