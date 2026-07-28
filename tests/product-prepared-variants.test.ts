import assert from "node:assert/strict";
import test from "node:test";

import {
  resolvePreparedVariantUnitPrice,
  resolvePreparedVariantsTotalPrice,
} from "@/lib/product-prepared-variants";

const tiers = [
  { minQuantity: 1, maxQuantity: 5, unitPrice: 3.35 },
  { minQuantity: 6, maxQuantity: 10, unitPrice: 3.2 },
  { minQuantity: 11, maxQuantity: null, unitPrice: 3 },
];

test("prepared variant summary uses per-line quantity tier, not aggregated quantity", () => {
  const lineA = { quantity: 5, unitPrice: 3.35 };
  const lineB = { quantity: 6, unitPrice: 3.55 };

  assert.equal(resolvePreparedVariantUnitPrice(3.35, tiers, lineA), 3.35);
  assert.equal(resolvePreparedVariantUnitPrice(3.35, tiers, lineB), 3.55);
  assert.equal(Math.round(lineA.quantity * 3.35 * 100) / 100, 16.75);
  assert.equal(Math.round(lineB.quantity * 3.55 * 100) / 100, 21.3);

  const total = resolvePreparedVariantsTotalPrice(3.35, tiers, [lineA, lineB]);
  assert.equal(Math.round(total * 100) / 100, 38.05);
});

test("aggregated quantity must not downgrade a 5-qty line when another line has 6 qty", () => {
  const lineA = { quantity: 5, unitPrice: 3.35 };
  const lineB = { quantity: 6, unitPrice: 3.55 };

  // Buggy aggregate-tier logic would price line A at 3.00 (11 total qty tier).
  assert.notEqual(resolvePreparedVariantUnitPrice(3.35, tiers, lineA), 3);
  assert.equal(
    Math.round(resolvePreparedVariantUnitPrice(3.35, tiers, lineA) * 5 * 100) / 100,
    16.75,
  );
  assert.equal(
    Math.round(resolvePreparedVariantUnitPrice(3.35, tiers, lineB) * 6 * 100) / 100,
    21.3,
  );
});
