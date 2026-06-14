import assert from "node:assert/strict";
import test from "node:test";

import {
  isCartQuantityAtLimit,
  normalizeCartQuantityWithLimit,
  resolveCartQuantityLimit,
} from "@/lib/cart/quantity-limits";

test("resolveCartQuantityLimit defaults to 99 for made_to_order lines", () => {
  assert.equal(resolveCartQuantityLimit(undefined), 99);
  assert.equal(resolveCartQuantityLimit(null), 99);
});

test("resolveCartQuantityLimit caps stocked snapshot", () => {
  assert.equal(resolveCartQuantityLimit(3), 3);
  assert.equal(resolveCartQuantityLimit(120), 99);
});

test("normalizeCartQuantityWithLimit respects stocked snapshot", () => {
  assert.equal(normalizeCartQuantityWithLimit(5, 3), 3);
  assert.equal(normalizeCartQuantityWithLimit(2, 3), 2);
  assert.equal(normalizeCartQuantityWithLimit(0, 3), 0);
});

test("isCartQuantityAtLimit is true only for stocked capped lines", () => {
  assert.equal(isCartQuantityAtLimit(99, undefined), false);
  assert.equal(isCartQuantityAtLimit(3, 3), true);
  assert.equal(isCartQuantityAtLimit(2, 3), false);
});
