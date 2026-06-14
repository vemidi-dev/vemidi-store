import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCategoryLastModifiedBySlug,
  buildSitemapEntry,
  parseSitemapTimestamp,
  resolveCategoryLastModified,
  resolveProductLastModified,
} from "@/lib/seo/sitemap-last-modified";
import type { StorefrontCategory } from "@/lib/storefront/types";

const category: StorefrontCategory = {
  id: "cat-1",
  name: "Кутии",
  slug: "kutii",
  category_type: "product",
  parent_id: null,
  show_on_home: true,
  home_sort_order: 1,
  card_description: null,
  createdAt: "2026-01-01T10:00:00.000Z",
};

const childCategory: StorefrontCategory = {
  id: "cat-2",
  name: "Подаръчни кутии",
  slug: "podarachni-kutii",
  category_type: "product",
  parent_id: "cat-1",
  show_on_home: false,
  home_sort_order: 1,
  card_description: null,
  createdAt: "2026-01-02T10:00:00.000Z",
};

const categories = [category, childCategory];

test("parseSitemapTimestamp rejects invalid values", () => {
  assert.equal(parseSitemapTimestamp(null), undefined);
  assert.equal(parseSitemapTimestamp(""), undefined);
  assert.equal(parseSitemapTimestamp("invalid"), undefined);
  assert.equal(
    parseSitemapTimestamp("2026-02-01T10:00:00.000Z")?.toISOString(),
    "2026-02-01T10:00:00.000Z",
  );
});

test("category lastModified uses latest product update", () => {
  const lastModifiedBySlug = buildCategoryLastModifiedBySlug(categories, [
    {
      categorySlugs: ["kutii"],
      updatedAt: "2026-02-01T10:00:00.000Z",
      createdAt: "2026-01-01T10:00:00.000Z",
    },
    {
      categorySlugs: ["kutii"],
      updatedAt: "2026-03-01T10:00:00.000Z",
      createdAt: "2026-01-01T10:00:00.000Z",
    },
  ]);

  assert.equal(
    resolveCategoryLastModified(category, lastModifiedBySlug)?.toISOString(),
    "2026-03-01T10:00:00.000Z",
  );
});

test("parent category lastModified includes child-assigned products", () => {
  const lastModifiedBySlug = buildCategoryLastModifiedBySlug(categories, [
    {
      categorySlugs: ["podarachni-kutii"],
      updatedAt: "2026-04-15T10:00:00.000Z",
      createdAt: "2026-01-03T10:00:00.000Z",
    },
  ]);

  assert.equal(
    resolveCategoryLastModified(category, lastModifiedBySlug)?.toISOString(),
    "2026-04-15T10:00:00.000Z",
  );
  assert.equal(
    resolveCategoryLastModified(childCategory, lastModifiedBySlug)?.toISOString(),
    "2026-04-15T10:00:00.000Z",
  );
});

test("category lastModified falls back to createdAt when no products exist", () => {
  assert.equal(
    resolveCategoryLastModified(category, new Map())?.toISOString(),
    "2026-01-01T10:00:00.000Z",
  );
});

test("product lastModified prefers updatedAt over createdAt", () => {
  assert.equal(
    resolveProductLastModified({
      updatedAt: "2026-04-01T10:00:00.000Z",
      createdAt: "2026-01-01T10:00:00.000Z",
    })?.toISOString(),
    "2026-04-01T10:00:00.000Z",
  );
});

test("product lastModified falls back to createdAt when updatedAt is missing", () => {
  assert.equal(
    resolveProductLastModified({
      updatedAt: null,
      createdAt: "2026-03-01T10:00:00.000Z",
    })?.toISOString(),
    "2026-03-01T10:00:00.000Z",
  );
});

test("product lastModified omits invalid timestamps", () => {
  assert.equal(
    resolveProductLastModified({
      updatedAt: null,
      createdAt: "invalid",
    }),
    undefined,
  );
});

test("sitemap entry omits lastModified when timestamp is missing", () => {
  const entry = buildSitemapEntry(
    "https://example.com/products/demo",
    undefined,
    "weekly",
    0.7,
  );

  assert.equal("lastModified" in entry, false);
});

test("sitemap entry includes lastModified when timestamp exists", () => {
  const updatedAt = new Date("2026-05-01T10:00:00.000Z");
  const entry = buildSitemapEntry(
    "https://example.com/products/demo",
    updatedAt,
    "weekly",
    0.7,
  );

  assert.equal(entry.lastModified?.toISOString(), updatedAt.toISOString());
});
