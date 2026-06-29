import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDuplicateProductName,
  buildDuplicateSuccessMessage,
  createIdMap,
  DUPLICATE_DRAFT_SUCCESS_BASE,
  DUPLICATE_EXCLUDED_RELATIONS,
  DUPLICATE_IMAGE_WARNING,
  DUPLICATE_PRODUCT_PUBLICATION_STATUS,
  DUPLICATE_RESET_FIELDS,
  getDuplicateProductErrorMessage,
  remapOptionDependencies,
} from "@/lib/admin/duplicate-product";

test("duplicate product name is prefixed with copy label", () => {
  assert.equal(buildDuplicateProductName("Пеперуда"), "Копие на Пеперуда");
  assert.equal(buildDuplicateProductName("  Рамка  "), "Копие на Рамка");
});

test("remap option dependencies uses new group and value ids", () => {
  const groups = [
    { id: "group-a", dependsOnOptionId: null },
    { id: "group-b", dependsOnOptionId: "value-a1" },
  ];
  const values = [
    { id: "value-a1", groupId: "group-a" },
    { id: "value-b1", groupId: "group-b" },
  ];
  const groupIdMap = createIdMap(["group-a", "group-b"]);
  const valueIdMap = createIdMap(["value-a1", "value-b1"]);

  const remapped = remapOptionDependencies(groups, values, groupIdMap, valueIdMap);

  assert.equal(remapped.remappedDependencies.get("new-group-a"), null);
  assert.equal(remapped.remappedDependencies.get("new-group-b"), "new-value-a1");
  assert.notEqual(remapped.remappedDependencies.get("new-group-b"), "value-a1");
});

test("remap option dependencies rejects broken dependency chains", () => {
  const groups = [{ id: "group-b", dependsOnOptionId: "missing-value" }];
  const values = [{ id: "value-b1", groupId: "group-b" }];
  const groupIdMap = createIdMap(["group-b"]);
  const valueIdMap = createIdMap(["value-b1"]);

  assert.throws(
    () => remapOptionDependencies(groups, values, groupIdMap, valueIdMap),
    /invalid_option_dependency/,
  );
});

test("duplicate product always targets draft publication status", () => {
  assert.equal(DUPLICATE_PRODUCT_PUBLICATION_STATUS, "draft");
});

test("duplicate success message states draft copy", () => {
  assert.equal(buildDuplicateSuccessMessage(), DUPLICATE_DRAFT_SUCCESS_BASE);
  assert.match(buildDuplicateSuccessMessage(), /чернова/i);
  assert.match(
    buildDuplicateSuccessMessage(DUPLICATE_IMAGE_WARNING),
    /чернова/i,
  );
  assert.match(
    buildDuplicateSuccessMessage(DUPLICATE_IMAGE_WARNING),
    /Изображенията не бяха копирани/,
  );
  assert.match(
    buildDuplicateSuccessMessage(null, { copyImagesRequested: false }),
    /чернова/i,
  );
  assert.match(
    buildDuplicateSuccessMessage(null, { copyImagesRequested: false }),
    /Добавете снимки/i,
  );
});

test("duplicate success message includes image warning when needed", () => {
  assert.match(
    buildDuplicateSuccessMessage(DUPLICATE_IMAGE_WARNING),
    /чернова/i,
  );
});

test("duplicate product error messages are localized", () => {
  assert.match(
    getDuplicateProductErrorMessage({
      message: "admin_required",
      code: "P0001",
      details: "",
      hint: "",
    }),
    /администраторски права/i,
  );
  assert.match(
    getDuplicateProductErrorMessage({
      message: "product_not_found",
      code: "P0002",
      details: "",
      hint: "",
    }),
    /не беше намерен/i,
  );
  assert.match(
    getDuplicateProductErrorMessage({
      message: "Could not find the function public.admin_duplicate_product",
      code: "",
      details: "",
      hint: "",
    }),
    /duplicate_product\.sql/i,
  );
});

test("new ids are generated for groups and values during remap planning", () => {
  const groupIdMap = createIdMap(["g1", "g2"]);
  const valueIdMap = createIdMap(["v1", "v2"]);

  assert.equal(groupIdMap.get("g1"), "new-g1");
  assert.equal(valueIdMap.get("v2"), "new-v2");
  assert.notEqual(groupIdMap.get("g1"), "g1");
});

test("duplicate operation excludes featured, related and promotion relations", () => {
  assert.deepEqual([...DUPLICATE_EXCLUDED_RELATIONS], [
    "home_featured_products",
    "related_products",
    "product_promotions",
  ]);
  assert.equal(DUPLICATE_RESET_FIELDS.isSoldOut, false);
  assert.equal(DUPLICATE_RESET_FIELDS.imageUrl, null);
});
