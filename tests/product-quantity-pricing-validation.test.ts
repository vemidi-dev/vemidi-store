import assert from "node:assert/strict";
import test from "node:test";

import { validateQuantityPriceTierRanges } from "@/lib/product-quantity-pricing";

test("validateQuantityPriceTierRanges accepts non-overlapping tiers", () => {
  const result = validateQuantityPriceTierRanges([
    { minQuantity: 1, maxQuantity: 5, unitPrice: 10 },
    { minQuantity: 6, maxQuantity: null, unitPrice: 8 },
  ]);

  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  assert.equal(result.tiers.length, 2);
});

test("validateQuantityPriceTierRanges rejects overlapping tiers", () => {
  const result = validateQuantityPriceTierRanges([
    { minQuantity: 1, maxQuantity: 10, unitPrice: 10 },
    { minQuantity: 10, maxQuantity: 20, unitPrice: 8 },
  ]);

  assert.equal(result.ok, false);
});

test("validateQuantityPriceTierRanges rejects invalid tier rows", () => {
  const result = validateQuantityPriceTierRanges([
    { minQuantity: 0, maxQuantity: 5, unitPrice: 10 },
  ]);

  assert.equal(result.ok, false);
});
