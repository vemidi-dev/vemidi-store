import assert from "node:assert/strict";
import test from "node:test";

import {
  buildBlogPostBreadcrumbItems,
  buildBreadcrumbListSchema,
  buildCategoryBreadcrumbItems,
  buildOccasionBreadcrumbItems,
  buildProductBreadcrumbItems,
  dedupeBreadcrumbItems,
} from "@/lib/seo/breadcrumbs";
import type { StorefrontCategory } from "@/lib/storefront/types";

const siteUrl = new URL("https://vemidi-store.vercel.app");

const categories: StorefrontCategory[] = [
  {
    id: "jewelry",
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
    id: "earrings",
    name: "Обеци",
    slug: "obetsi",
    category_type: "product",
    parent_id: "jewelry",
    show_on_home: false,
    home_sort_order: 1,
    card_description: null,
    createdAt: null,
  },
];

test("category breadcrumb includes parent for subcategory", () => {
  const child = categories[1];
  const items = buildCategoryBreadcrumbItems(categories, child);

  assert.deepEqual(
    items.map((item) => item.path),
    ["/", "/categorii", "/categorii/bijuta", "/categorii/obetsi"],
  );
});

test("product breadcrumb prefers assigned product category", () => {
  const items = buildProductBreadcrumbItems(categories, {
    title: "Сребърен медальон",
    slug: "sreburen-medalyon",
    categorySlugs: ["obetsi", "bijuta"],
  });

  assert.deepEqual(
    items.map((item) => item.name),
    ["Начало", "Категории", "Бижута", "Обеци", "Сребърен медальон"],
  );
});

test("breadcrumb schema uses absolute urls and sequential positions", () => {
  const schema = buildBreadcrumbListSchema(
    buildBlogPostBreadcrumbItems({
      title: "Идеи за подарък",
      slug: "idei-za-podarak",
    }),
    siteUrl,
  );

  assert.equal(schema["@type"], "BreadcrumbList");
  assert.equal(schema.itemListElement.length, 3);
  assert.equal(schema.itemListElement[0]?.position, 1);
  assert.equal(schema.itemListElement[2]?.item, `${siteUrl.origin}/blog/idei-za-podarak`);
});

test("occasion breadcrumb uses /povodi landing path", () => {
  const items = buildOccasionBreadcrumbItems({
    name: "Сватба",
    slug: "svatba",
  });

  assert.deepEqual(
    items.map((item) => item.path),
    ["/", "/povodi", "/povodi/svatba"],
  );
});

test("dedupe breadcrumb removes duplicate entries", () => {
  const items = dedupeBreadcrumbItems([
    { name: "Начало", path: "/" },
    { name: "Начало", path: "/" },
    { name: "Блог", path: "/blog" },
  ]);

  assert.equal(items.length, 2);
});
