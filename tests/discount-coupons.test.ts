import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCouponPreviewFailure,
  buildCouponPreviewSuccess,
  computeCouponDiscount,
  extractOrderCouponSummary,
  normalizeCouponCode,
} from "@/lib/checkout/coupon";
import { checkoutErrorMessages, mapCheckoutError } from "@/lib/checkout/errors";

test("normalizeCouponCode trims uppercases and validates format", () => {
  assert.equal(normalizeCouponCode("  save10 "), "SAVE10");
  assert.equal(normalizeCouponCode("ABC1"), "ABC1");
  assert.equal(normalizeCouponCode("ab"), null);
  assert.equal(normalizeCouponCode("SAVE-10"), null);
  assert.equal(normalizeCouponCode(""), null);
  assert.equal(normalizeCouponCode(null), null);
});

test("mapCheckoutError localizes coupon failures", () => {
  assert.equal(mapCheckoutError("coupon_invalid"), checkoutErrorMessages.coupon_invalid);
  assert.equal(mapCheckoutError("coupon_used"), checkoutErrorMessages.coupon_used);
  assert.equal(mapCheckoutError("coupon_inactive"), checkoutErrorMessages.coupon_inactive);
});

test("computeCouponDiscount rounds preview amounts and never goes below zero", () => {
  assert.deepEqual(computeCouponDiscount(100, 10), {
    discountAmount: 10,
    total: 90,
  });
  assert.deepEqual(computeCouponDiscount(33.33, 10), {
    discountAmount: 3.33,
    total: 30,
  });
  assert.deepEqual(computeCouponDiscount(50, 100), {
    discountAmount: 50,
    total: 0,
  });
});

test("coupon preview helpers never imply used marking", () => {
  const success = buildCouponPreviewSuccess({
    code: "SAVE10",
    discountPercentage: 10,
    subtotal: 80,
  });
  assert.equal(success.ok, true);
  assert.equal(success.code, "SAVE10");
  assert.equal(success.discountAmount, 8);
  assert.equal(success.total, 72);
  assert.equal("used_at" in success, false);
  assert.equal("used_order_id" in success, false);

  const failure = buildCouponPreviewFailure("coupon_used");
  assert.equal(failure.ok, false);
  assert.equal(failure.message, checkoutErrorMessages.coupon_used);
});

test("extractOrderCouponSummary reads coupon fields from raw_payload without breaking legacy orders", () => {
  assert.equal(extractOrderCouponSummary(null), null);
  assert.equal(extractOrderCouponSummary({ order: { totalPrice: 10 } }), null);
  assert.deepEqual(
    extractOrderCouponSummary({
      order: {
        couponCode: "save10",
        discountPercentage: 15,
        subtotalPrice: 100,
        discountAmount: 15,
        totalPrice: 85,
      },
    }),
    {
      couponCode: "SAVE10",
      discountPercentage: 15,
      subtotalPrice: 100,
      discountAmount: 15,
      totalPrice: 85,
    },
  );
});
