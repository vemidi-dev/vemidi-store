import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { adminFormFields } from "@/lib/admin/form-fields";
import {
  buildRelatedCategorySelectorOptions,
  filterSelectableRelatedCategories,
  type CategoryRelatedSelectorCategory,
} from "@/lib/admin/category-related";

const categories: CategoryRelatedSelectorCategory[] = [
  {
    id: "gifts",
    name: "Бебешки подаръци",
    slug: "bebeshki-podaratsi",
    category_type: "product",
    parent_id: null,
    home_sort_order: 10,
    is_visible: true,
  },
  {
    id: "albums",
    name: "Албуми",
    slug: "albumi",
    category_type: "product",
    parent_id: null,
    home_sort_order: 20,
    is_visible: true,
  },
  {
    id: "baby-albums",
    name: "Бебешки албуми",
    slug: "bebeshki-albumi",
    category_type: "product",
    parent_id: "albums",
    home_sort_order: 10,
    is_visible: true,
  },
  {
    id: "hidden",
    name: "Скрита",
    slug: "skrita",
    category_type: "product",
    parent_id: null,
    home_sort_order: 30,
    is_visible: false,
  },
  {
    id: "wedding",
    name: "Сватба",
    slug: "svatba",
    category_type: "occasion",
    parent_id: null,
    home_sort_order: 10,
    is_visible: true,
  },
];

test("filterSelectableRelatedCategories excludes current category", () => {
  const selectable = filterSelectableRelatedCategories(categories, {
    excludeCategoryId: "gifts",
  });

  assert.equal(
    selectable.some((category) => category.id === "gifts"),
    false,
  );
});

test("filterSelectableRelatedCategories excludes direct children", () => {
  const selectable = filterSelectableRelatedCategories(categories, {
    excludeCategoryId: "albums",
  });

  assert.deepEqual(
    selectable.map((category) => category.id).sort(),
    ["gifts"],
  );
});

test("filterSelectableRelatedCategories excludes occasion categories", () => {
  const selectable = filterSelectableRelatedCategories(categories, {
    excludeCategoryId: "gifts",
  });

  assert.equal(
    selectable.some((category) => category.category_type === "occasion"),
    false,
  );
});

test("filterSelectableRelatedCategories excludes hidden categories", () => {
  const selectable = filterSelectableRelatedCategories(categories, {
    excludeCategoryId: "gifts",
  });

  assert.equal(
    selectable.some((category) => category.id === "hidden"),
    false,
  );
});

test("buildRelatedCategorySelectorOptions uses hierarchy display labels", () => {
  const options = buildRelatedCategorySelectorOptions(categories, {
    excludeCategoryId: "gifts",
  });

  assert.deepEqual(
    options.map((option) => option.label),
    ["Албуми", "Албуми / Бебешки албуми"],
  );
});

test("admin category forms include related category field name", () => {
  assert.equal(adminFormFields.category.relatedCategoryIds, "related_category_ids");

  const panelSource = readFileSync(
    new URL("../components/admin/category-management-panel.tsx", import.meta.url),
    "utf8",
  );
  const viewSource = readFileSync(
    new URL("../components/admin/category-management-view.tsx", import.meta.url),
    "utf8",
  );
  const selectorSource = readFileSync(
    new URL("../components/admin/category-related-selector.tsx", import.meta.url),
    "utf8",
  );

  assert.match(panelSource, /CategoryRelatedSelector/);
  assert.match(viewSource, /CategoryRelatedSelector/);
  assert.match(selectorSource, /adminFormFields\.category\.relatedCategoryIds/);
});

test("edit category form passes selected related ids to selector", () => {
  const viewSource = readFileSync(
    new URL("../components/admin/category-management-view.tsx", import.meta.url),
    "utf8",
  );

  assert.match(viewSource, /relatedCategoryIdsByCategoryId\.get\(category\.id\)/);
  assert.match(viewSource, /selectedRelatedIds=/);
  assert.match(
    viewSource,
    /updateCategory/,
  );
});

test("update category action still parses related category ids", () => {
  const actionsSource = readFileSync(
    new URL("../app/admin/actions.ts", import.meta.url),
    "utf8",
  );

  assert.match(
    actionsSource,
    /async function updateCategory[\s\S]*?parseRelatedCategoryIdsFromFormData/,
  );
  assert.match(
    actionsSource,
    /async function updateCategory[\s\S]*?syncCategoryRelatedCategories/,
  );
});
