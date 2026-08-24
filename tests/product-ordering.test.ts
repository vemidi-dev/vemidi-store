import assert from "node:assert/strict";
import test from "node:test";

import {
  buildProductOrderSavePayload,
  compareCatalogSortOrder,
  compareHomeFeaturedSortOrder,
  moveItemDown,
  moveItemToBottom,
  moveItemToTop,
  moveItemUp,
  normalizeProductSortOrders,
  parseOrderedProductIds,
  PRODUCT_SORT_ORDER_STEP,
} from "@/lib/admin/product-ordering";

test("normalizeProductSortOrders uses step 10 positions", () => {
  assert.deepEqual(normalizeProductSortOrders(4), [10, 20, 30, 40]);
  assert.equal(PRODUCT_SORT_ORDER_STEP, 10);
});

test("buildProductOrderSavePayload maps ids to sort orders", () => {
  assert.deepEqual(buildProductOrderSavePayload(["a", "b", "c"]), [
    { productId: "a", sortOrder: 10 },
    { productId: "b", sortOrder: 20 },
    { productId: "c", sortOrder: 30 },
  ]);
});

test("move helpers reorder list items", () => {
  const items = ["a", "b", "c", "d"];

  assert.deepEqual(moveItemUp(items, 2), ["a", "c", "b", "d"]);
  assert.deepEqual(moveItemDown(items, 1), ["a", "c", "b", "d"]);
  assert.deepEqual(moveItemToTop(items, 3), ["d", "a", "b", "c"]);
  assert.deepEqual(moveItemToBottom(items, 0), ["b", "c", "d", "a"]);
});

test("parseOrderedProductIds deduplicates while preserving order", () => {
  assert.deepEqual(
    parseOrderedProductIds(["one", "two", "one", "", "three"]),
    ["one", "two", "three"],
  );
});

test("compareHomeFeaturedSortOrder prefers lower sort order", () => {
  assert.equal(
    compareHomeFeaturedSortOrder(
      { sortOrder: 10, name: "Б" },
      { sortOrder: 20, name: "А" },
    ),
    -10,
  );
});

test("compareCatalogSortOrder prefers explicit catalog order then created_at", () => {
  assert.equal(
    compareCatalogSortOrder(
      { catalogSortOrder: 10, createdAt: "2026-01-01", id: "a" },
      { catalogSortOrder: 20, createdAt: "2026-01-02", id: "b" },
    ),
    -10,
  );

  assert.ok(
    compareCatalogSortOrder(
      { catalogSortOrder: 0, createdAt: "2026-01-01", id: "a" },
      { catalogSortOrder: 0, createdAt: "2026-01-03", id: "b" },
    ) > 0,
  );

  assert.ok(
    compareCatalogSortOrder(
      { catalogSortOrder: 10, createdAt: "2026-01-01", id: "a" },
      { catalogSortOrder: 0, createdAt: "2026-01-03", id: "b" },
    ) < 0,
  );
});

test("catalog listing sort keeps explicit order before unset rows", () => {
  const items = [
    { id: "newest-unset", catalogSortOrder: 0, createdAt: "2026-03-01" },
    { id: "second", catalogSortOrder: 20, createdAt: "2026-01-02" },
    { id: "first", catalogSortOrder: 10, createdAt: "2026-01-01" },
  ];

  items.sort((left, right) => compareCatalogSortOrder(left, right));

  assert.deepEqual(
    items.map((item) => item.id),
    ["first", "second", "newest-unset"],
  );
});
