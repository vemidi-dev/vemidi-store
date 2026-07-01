import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getCategoryPath } from "@/lib/category-url";
import { getRelatedCategoriesForCategory } from "@/lib/category-related-storefront";
import {
  buildBreadcrumbListSchema,
  buildCategoryBreadcrumbItems,
} from "@/lib/seo/breadcrumbs";
import type { StorefrontCategory } from "@/lib/storefront/types";

const categories: StorefrontCategory[] = [
  {
    id: "gifts",
    name: "Бебешки подаръци",
    slug: "bebeshki-podaratsi",
    category_type: "product",
    parent_id: null,
    show_on_home: true,
    home_sort_order: 10,
    card_description: "Подаръци за бебе.",
    is_visible: true,
    createdAt: null,
  },
  {
    id: "albums",
    name: "Албуми",
    slug: "albumi",
    category_type: "product",
    parent_id: null,
    show_on_home: true,
    home_sort_order: 20,
    card_description: null,
    is_visible: true,
    createdAt: null,
  },
  {
    id: "baby-albums",
    name: "Бебешки албуми",
    slug: "bebeshki-albumi",
    category_type: "product",
    parent_id: "albums",
    show_on_home: false,
    home_sort_order: 10,
    card_description: null,
    is_visible: true,
    createdAt: null,
  },
  {
    id: "hidden",
    name: "Скрита",
    slug: "skrita",
    category_type: "product",
    parent_id: null,
    show_on_home: false,
    home_sort_order: 30,
    card_description: null,
    is_visible: false,
    createdAt: null,
  },
  {
    id: "wedding",
    name: "Сватба",
    slug: "svatba",
    category_type: "occasion",
    parent_id: null,
    show_on_home: true,
    home_sort_order: 10,
    card_description: null,
    is_visible: true,
    createdAt: null,
  },
];

const gifts = categories[0];
const relatedCategoryIdsByCategoryId = new Map<string, string[]>([
  ["gifts", ["baby-albums", "gifts", "albums", "hidden", "wedding"]],
]);

test("getRelatedCategoriesForCategory returns only visible product categories", () => {
  const related = getRelatedCategoriesForCategory(
    categories,
    relatedCategoryIdsByCategoryId,
    gifts,
  );

  assert.deepEqual(
    related.map((category) => category.slug),
    ["bebeshki-albumi", "albumi"],
  );
});

test("getRelatedCategoriesForCategory filters current category", () => {
  const related = getRelatedCategoriesForCategory(
    categories,
    new Map([["gifts", ["gifts"]]]),
    gifts,
  );

  assert.equal(related.length, 0);
});

test("getRelatedCategoriesForCategory filters direct children", () => {
  const albums = categories[1];
  const related = getRelatedCategoriesForCategory(
    categories,
    new Map([["albums", ["baby-albums"]]]),
    albums,
  );

  assert.equal(related.length, 0);
});

test("getRelatedCategoriesForCategory returns empty list without links", () => {
  assert.deepEqual(
    getRelatedCategoriesForCategory(categories, new Map(), gifts),
    [],
  );
});

test("getRelatedCategoriesForCategory preserves admin sort order", () => {
  const related = getRelatedCategoriesForCategory(
    categories,
    new Map([["gifts", ["albums", "baby-albums"]]]),
    gifts,
  );

  assert.deepEqual(
    related.map((category) => category.id),
    ["albums", "baby-albums"],
  );
});

test("related categories helper does not affect breadcrumbs schema", () => {
  const related = getRelatedCategoriesForCategory(
    categories,
    relatedCategoryIdsByCategoryId,
    gifts,
  );
  const breadcrumbItems = buildCategoryBreadcrumbItems(categories, gifts);
  const schema = buildBreadcrumbListSchema(
    breadcrumbItems,
    new URL("https://vemidi-store.vercel.app"),
  );

  assert.equal(related.length, 2);
  assert.deepEqual(
    breadcrumbItems.map((item) => item.path),
    ["/", "/categorii", "/categorii/bebeshki-podaratsi"],
  );
  assert.equal(schema.itemListElement.length, 3);
  assert.equal(
    schema.itemListElement.some((item) =>
      String(item.item).includes("bebeshki-albumi"),
    ),
    false,
  );
});

test("related category cards use canonical /categorii paths", () => {
  const related = getRelatedCategoriesForCategory(
    categories,
    new Map([["gifts", ["baby-albums"]]]),
    gifts,
  );

  assert.equal(getCategoryPath(related[0]!.slug), "/categorii/bebeshki-albumi");
});

test("category page renders related categories section", () => {
  const pageSource = readFileSync(
    new URL("../app/categories/[slug]/page.tsx", import.meta.url),
    "utf8",
  );
  const sectionSource = readFileSync(
    new URL("../components/category/category-related-section.tsx", import.meta.url),
    "utf8",
  );

  assert.match(pageSource, /getRelatedCategoriesForCategory/);
  assert.match(pageSource, /CategoryRelatedSection/);
  assert.match(sectionSource, /Свързани категории/);
  assert.match(sectionSource, /CategoryShowcaseCard/);
  assert.match(sectionSource, /Още подходящи идеи от каталога/);
});

test("storefront catalog fetch includes category related categories", () => {
  const repositorySource = readFileSync(
    new URL("../lib/storefront/repository.ts", import.meta.url),
    "utf8",
  );

  assert.match(repositorySource, /category_related_categories/);
  assert.match(repositorySource, /relatedCategoryIdsByCategoryId/);
  assert.match(repositorySource, /categoryRelatedCategoriesResult\.error/);
});
