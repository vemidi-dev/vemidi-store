import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateEffectivePrice,
  getPromotionLabel,
  isPromotionActive,
  isProductOnPromotion,
  resolveProductPricing,
  type ProductPromotionRow,
} from "@/lib/product-pricing";

const basePromotion: ProductPromotionRow = {
  id: "promo-1",
  product_id: "product-1",
  name: "Пролет",
  discount_type: "percentage",
  discount_value: 20,
  starts_at: "2026-01-01T00:00:00.000Z",
  ends_at: "2026-12-31T23:59:59.000Z",
  is_active: true,
  created_at: "2026-01-01T00:00:00.000Z",
};

test("calculateEffectivePrice applies percentage discounts", () => {
  assert.equal(calculateEffectivePrice(50, "percentage", 20), 40);
});

test("calculateEffectivePrice applies fixed final prices", () => {
  assert.equal(calculateEffectivePrice(50, "fixed_price", 35), 35);
});

test("calculateEffectivePrice falls back to base price when discount is not real", () => {
  assert.equal(calculateEffectivePrice(50, "fixed_price", 55), 50);
});

test("isPromotionActive respects active flag and period", () => {
  assert.equal(
    isPromotionActive(basePromotion, new Date("2026-06-01T12:00:00.000Z")),
    true,
  );
  assert.equal(
    isPromotionActive(
      { ...basePromotion, is_active: false },
      new Date("2026-06-01T12:00:00.000Z"),
    ),
    false,
  );
  assert.equal(
    isPromotionActive(basePromotion, new Date("2027-01-01T00:00:00.000Z")),
    false,
  );
});

test("resolveProductPricing exposes compareAtPrice only for active promotions", () => {
  const active = resolveProductPricing(50, basePromotion, new Date("2026-06-01T12:00:00.000Z"));
  assert.equal(active.price, 40);
  assert.equal(active.compareAtPrice, 50);
  assert.equal(active.promotion?.label, "-20%");

  const expired = resolveProductPricing(50, basePromotion, new Date("2027-01-01T00:00:00.000Z"));
  assert.equal(expired.price, 50);
  assert.equal(expired.compareAtPrice, null);
  assert.equal(expired.promotion, null);
});

test("getPromotionLabel formats fixed price promotions as percent when possible", () => {
  assert.equal(getPromotionLabel("fixed_price", 35, 50, 35), "-30%");
});

test("isProductOnPromotion checks compareAtPrice against current price", () => {
  assert.equal(isProductOnPromotion({ price: 40, compareAtPrice: 50 }), true);
  assert.equal(isProductOnPromotion({ price: 50, compareAtPrice: null }), false);
});
