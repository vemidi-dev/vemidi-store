import assert from "node:assert/strict";
import test from "node:test";

import {
  filterStorefrontPublishedProductIds,
  filterStorefrontPublishedProducts,
  isProductStorefrontPublished,
  normalizeProductPublicationStatus,
} from "@/lib/product-publication";
import { filterCatalogVisibleProducts } from "@/lib/product-visibility";

test("isProductStorefrontPublished allows only published", () => {
  assert.equal(isProductStorefrontPublished("published"), true);
  assert.equal(isProductStorefrontPublished("draft"), false);
  assert.equal(isProductStorefrontPublished("archived"), false);
  assert.equal(isProductStorefrontPublished(undefined), false);
});

test("normalizeProductPublicationStatus falls back safely", () => {
  assert.equal(normalizeProductPublicationStatus("draft"), "draft");
  assert.equal(normalizeProductPublicationStatus("published"), "published");
  assert.equal(normalizeProductPublicationStatus("archived"), "archived");
  assert.equal(normalizeProductPublicationStatus("unknown"), "draft");
  assert.equal(normalizeProductPublicationStatus(null, "published"), "published");
});

test("filterStorefrontPublishedProducts keeps published rows only", () => {
  const products = [
    { id: "1", status: "published" as const },
    { id: "2", status: "draft" as const },
    { id: "3", status: "archived" as const },
    { id: "4", status: undefined },
  ];

  assert.deepEqual(filterStorefrontPublishedProducts(products), [
    { id: "1", status: "published" },
    { id: "4", status: undefined },
  ]);
});

test("filterStorefrontPublishedProductIds keeps published ids only", () => {
  const publishedIds = new Set(["a", "c"]);
  assert.deepEqual(
    filterStorefrontPublishedProductIds(["a", "b", "c"], publishedIds),
    ["a", "c"],
  );
});

test("published upsell-only products can be excluded from storefront catalog", () => {
  const products = filterStorefrontPublishedProducts([
    { id: "public", status: "published" as const, visibility: "public" as const },
    {
      id: "upsell",
      status: "published" as const,
      visibility: "upsell_only" as const,
    },
    { id: "draft", status: "draft" as const, visibility: "public" as const },
  ]);

  assert.deepEqual(filterCatalogVisibleProducts(products), [
    { id: "public", status: "published", visibility: "public" },
  ]);
});
