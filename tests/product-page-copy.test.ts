import assert from "node:assert/strict";
import { test } from "node:test";

import { siteContentDefaults } from "@/lib/content/site-content";
import {
  getPriceSummaryLabel,
  getPriceSummaryNote,
  resolveProductPageCopy,
} from "@/lib/content/product-page-copy";

test("resolveProductPageCopy maps service blocks and price labels", () => {
  const copy = resolveProductPageCopy(siteContentDefaults);

  assert.equal(copy.priceSummaryLabel, "Ориентировъчна цена");
  assert.equal(copy.priceSummaryLabelStock, "Цена за този продукт");
  assert.equal(copy.serviceBlocks.length, 3);
  assert.equal(copy.serviceBlocks[0]?.id, "production");
  assert.equal(copy.serviceBlocks[0]?.title, "Изработка");
  assert.equal(copy.serviceBlocks[0]?.linkHref, "/kontakti");
});

test("getPriceSummaryLabel falls back to stock default", () => {
  const copy = resolveProductPageCopy({
    ...siteContentDefaults,
    "product.price_summary_label_stock": "   ",
  });

  assert.equal(getPriceSummaryLabel(copy, true), "Цена за този продукт");
  assert.equal(getPriceSummaryNote(copy, true), null);
  assert.equal(
    getPriceSummaryNote(copy, false),
    "(окончателната се потвърждава при поръчка)",
  );
});
