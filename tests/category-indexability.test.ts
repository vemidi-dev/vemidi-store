import assert from "node:assert/strict";
import test from "node:test";

import {
  filterIndexableProductCategories,
  getProductCategorySlugs,
  isProductCategoryIndexable,
} from "@/lib/seo/category-indexability";
import { buildCategoryPageMetadata } from "@/lib/seo/category-metadata";
import type { StorefrontCategory } from "@/lib/storefront/types";

const categories: StorefrontCategory[] = [
  {
    id: "parent",
    name: "Бижута",
    slug: "bijuta",
    category_type: "product",
    parent_id: null,
    show_on_home: true,
    home_sort_order: 1,
    card_description: null,
    createdAt: null,
  },
  {
    id: "child",
    name: "Обеци",
    slug: "obetsi",
    category_type: "product",
    parent_id: "parent",
    show_on_home: false,
    home_sort_order: 1,
    card_description: null,
    createdAt: null,
  },
  {
    id: "empty",
    name: "Празна",
    slug: "prazna",
    category_type: "product",
    parent_id: null,
    show_on_home: false,
    home_sort_order: 2,
    card_description: null,
    createdAt: null,
  },
];

const products = [
  { categorySlugs: ["obetsi"] },
  { categorySlugs: ["bijuta"] },
];

test("hidden category is not indexable even with products", () => {
  const slugs = getProductCategorySlugs(products);
  const hiddenParent = { ...categories[0], is_visible: false };

  assert.equal(
    isProductCategoryIndexable(categories, slugs, hiddenParent),
    false,
  );
  assert.deepEqual(
    filterIndexableProductCategories(
      [hiddenParent, ...categories.slice(1)],
      slugs,
    ).map((category) => category.slug),
    [],
  );
});

test("empty category is not indexable", () => {
  const slugs = getProductCategorySlugs(products);
  const empty = categories[2];

  assert.equal(
    isProductCategoryIndexable(categories, slugs, empty),
    false,
  );
});

test("parent with products in child remains indexable", () => {
  const slugs = getProductCategorySlugs(products);
  const parent = categories[0];

  assert.equal(
    isProductCategoryIndexable(categories, slugs, parent),
    true,
  );
});

test("filterIndexableProductCategories excludes empty categories", () => {
  const slugs = getProductCategorySlugs(products);
  const indexable = filterIndexableProductCategories(categories, slugs);

  assert.deepEqual(
    indexable.map((category) => category.slug).sort(),
    ["bijuta", "obetsi"],
  );
});

test("empty category metadata is noindex but keeps canonical", () => {
  const empty = categories[2];
  const metadata = buildCategoryPageMetadata({
    category: empty,
    categories,
    productCategorySlugs: getProductCategorySlugs([]),
    parent: null,
  });

  assert.deepEqual(metadata.robots, { index: false, follow: true });
  assert.equal(metadata.alternates?.canonical, "/categorii/prazna");
  assert.equal(metadata.twitter?.title, empty.name);
});

test("category metadata uses admin meta_title when provided", () => {
  const category = {
    ...categories[1],
    meta_title: "Обеци SEO",
    meta_description: "Ръчно изработени обеци.",
  };
  const metadata = buildCategoryPageMetadata({
    category,
    categories,
    productCategorySlugs: [["obetsi"]],
    parent: categories[0],
  });

  assert.equal(metadata.title, "Обеци SEO");
  assert.equal(metadata.description, "Ръчно изработени обеци.");
});

test("filtered category metadata is noindex with the clean canonical", () => {
  const category = categories[1];
  const metadata = buildCategoryPageMetadata({
    category,
    categories,
    productCategorySlugs: [["obetsi"]],
    parent: categories[0],
    faceted: true,
  });

  assert.deepEqual(metadata.robots, { index: false, follow: true });
  assert.equal(metadata.alternates?.canonical, "/categorii/obetsi");
});
