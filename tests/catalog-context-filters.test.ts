import assert from "node:assert/strict";
import test from "node:test";

import {
  filterProductsByOccasion,
  filterProductsByProductCategory,
  getOccasionFilterOptions,
  getProductCategoryFilterOptions,
} from "@/lib/catalog-context-filters";
import type {
  StorefrontCategory,
  StorefrontProduct,
} from "@/lib/storefront/types";

const categories = [
  {
    id: "envelopes",
    name: "Пликове",
    slug: "plikove",
    category_type: "product",
    parent_id: null,
    home_sort_order: 10,
  },
  {
    id: "money-envelopes",
    name: "Пликове за пари",
    slug: "plik-za-pari",
    category_type: "product",
    parent_id: "envelopes",
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
  {
    id: "baptism",
    name: "Кръщене",
    slug: "krashtene",
    category_type: "occasion",
    parent_id: null,
    home_sort_order: 20,
  },
] as StorefrontCategory[];

const baseProduct = {
  id: "product",
  title: "Product",
  description: "Description",
  price: 10,
  imageSrc: "/product.jpg",
  imageAlt: "Product",
  customizable: false,
  categorySlugs: [],
} as unknown as StorefrontProduct;

const products = [
  {
    ...baseProduct,
    id: "wedding-envelope",
    categorySlugs: ["plik-za-pari", "svatba"],
  },
  {
    ...baseProduct,
    id: "baptism-envelope",
    categorySlugs: ["plik-za-pari", "krashtene"],
  },
] as StorefrontProduct[];

test("occasion options include only occasions available in the current products", () => {
  assert.deepEqual(getOccasionFilterOptions(categories, products), [
    { value: "krashtene", label: "Кръщене", count: 1 },
    { value: "svatba", label: "Сватба", count: 1 },
  ]);
});

test("category options count matching category families", () => {
  assert.deepEqual(getProductCategoryFilterOptions(categories, products), [
    { value: "plikove", label: "Пликове", count: 2 },
    {
      value: "plik-za-pari",
      label: "Пликове / Пликове за пари",
      count: 2,
    },
  ]);
});

test("occasion filter keeps the base category context", () => {
  const options = getOccasionFilterOptions(categories, products);
  assert.deepEqual(
    filterProductsByOccasion(products, "svatba", options).map(
      (product) => product.id,
    ),
    ["wedding-envelope"],
  );
});

test("product category filter keeps the base occasion context", () => {
  const options = getProductCategoryFilterOptions(categories, products);
  assert.equal(
    filterProductsByProductCategory(
      products,
      "plikove",
      categories,
      options,
    ).length,
    2,
  );
});
