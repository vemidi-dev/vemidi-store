import assert from "node:assert/strict";
import test from "node:test";

import {
  getCategoryDisplayLabel,
  getCategoryFamilySlugs,
  getCategoryProductCount,
  getChildCategories,
  getTopLevelCategories,
  sortCategoriesForDisplay,
  type HierarchicalCategory,
} from "@/lib/category-hierarchy";

const categories: HierarchicalCategory[] = [
  {
    id: "jewelry",
    name: "Бижута и аксесоари",
    slug: "bijuta-i-aksesoari",
    category_type: "product",
    parent_id: null,
    home_sort_order: 10,
  },
  {
    id: "earrings",
    name: "Обеци",
    slug: "obetsi",
    category_type: "product",
    parent_id: "jewelry",
    home_sort_order: 10,
  },
  {
    id: "sets",
    name: "Комплекти",
    slug: "komplekti",
    category_type: "product",
    parent_id: "jewelry",
    home_sort_order: 20,
  },
  {
    id: "boxes",
    name: "Кутии",
    slug: "kutii",
    category_type: "product",
    parent_id: null,
    home_sort_order: 20,
  },
  {
    id: "wedding",
    name: "Сватба",
    slug: "svatba",
    category_type: "occasion",
    parent_id: null,
    home_sort_order: 10,
  },
];

test("category hierarchy returns roots and ordered children", () => {
  assert.deepEqual(
    getTopLevelCategories(categories, "product").map((category) => category.id),
    ["jewelry", "boxes"],
  );
  assert.deepEqual(
    getChildCategories(categories, "jewelry").map((category) => category.id),
    ["earrings", "sets"],
  );
});

test("parent category family includes its child slugs", () => {
  assert.deepEqual(getCategoryFamilySlugs(categories, categories[0]), [
    "bijuta-i-aksesoari",
    "obetsi",
    "komplekti",
  ]);
  assert.deepEqual(getCategoryFamilySlugs(categories, categories[1]), ["obetsi"]);
});

test("parent product count includes children without double counting products", () => {
  const assignments = [
    ["obetsi"],
    ["komplekti"],
    ["bijuta-i-aksesoari", "obetsi"],
    ["kutii"],
  ];
  assert.equal(
    getCategoryProductCount(
      assignments,
      getCategoryFamilySlugs(categories, categories[0]),
    ),
    3,
  );
});

test("admin display order keeps children below their parent", () => {
  assert.deepEqual(
    sortCategoriesForDisplay(
      categories.filter((category) => category.category_type === "product"),
    ).map((category) => category.id),
    ["jewelry", "earrings", "sets", "boxes"],
  );
  assert.equal(
    getCategoryDisplayLabel(categories, categories[1]),
    "Бижута и аксесоари / Обеци",
  );
});
