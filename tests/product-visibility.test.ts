import assert from "node:assert/strict";
import test from "node:test";

import {
  filterCatalogVisibleProducts,
  isProductCatalogVisible,
  isProductUpsellTargetVisible,
  normalizeProductVisibility,
} from "@/lib/product-visibility";

test("normalizeProductVisibility falls back to public", () => {
  assert.equal(normalizeProductVisibility("public"), "public");
  assert.equal(normalizeProductVisibility("upsell_only"), "upsell_only");
  assert.equal(normalizeProductVisibility("hidden"), "public");
  assert.equal(normalizeProductVisibility(null), "public");
});

test("isProductCatalogVisible keeps only public products", () => {
  assert.equal(isProductCatalogVisible("public"), true);
  assert.equal(isProductCatalogVisible("upsell_only"), false);
  assert.equal(isProductCatalogVisible(undefined), true);
});

test("isProductUpsellTargetVisible allows public and upsell-only products", () => {
  assert.equal(isProductUpsellTargetVisible("public"), true);
  assert.equal(isProductUpsellTargetVisible("upsell_only"), true);
});

test("filterCatalogVisibleProducts removes upsell-only products from lists", () => {
  const products = [
    { id: "public", visibility: "public" as const },
    { id: "upsell", visibility: "upsell_only" as const },
    { id: "legacy" },
  ];

  assert.deepEqual(filterCatalogVisibleProducts(products), [
    { id: "public", visibility: "public" },
    { id: "legacy" },
  ]);
});
