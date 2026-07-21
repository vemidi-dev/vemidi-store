import assert from "node:assert/strict";
import test from "node:test";

import {
  buildOrdersCustomerSearchOrFilter,
  parseOrdersQuery,
} from "@/lib/admin/orders";
import {
  buildCouponPreviewFailure,
  buildCouponPreviewSuccess,
  computeCouponDiscount,
  extractOrderCouponSummary,
  isCouponExpired,
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

test("mapCheckoutError localizes coupon failures including expired", () => {
  assert.equal(mapCheckoutError("coupon_invalid"), checkoutErrorMessages.coupon_invalid);
  assert.equal(mapCheckoutError("coupon_used"), checkoutErrorMessages.coupon_used);
  assert.equal(mapCheckoutError("coupon_inactive"), checkoutErrorMessages.coupon_inactive);
  assert.equal(mapCheckoutError("coupon_expired"), checkoutErrorMessages.coupon_expired);
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
    expiresAt: "2026-12-31T21:00:00.000Z",
  });
  assert.equal(success.ok, true);
  assert.equal(success.code, "SAVE10");
  assert.equal(success.discountAmount, 8);
  assert.equal(success.total, 72);
  assert.equal(success.expiresAt, "2026-12-31T21:00:00.000Z");
  assert.equal("used_at" in success, false);
  assert.equal("used_order_id" in success, false);

  const failure = buildCouponPreviewFailure("coupon_used");
  assert.equal(failure.ok, false);
  assert.equal(failure.message, checkoutErrorMessages.coupon_used);

  const expired = buildCouponPreviewFailure("coupon_expired");
  assert.equal(expired.ok, false);
  assert.equal(expired.code, "coupon_expired");
  assert.equal(expired.message, checkoutErrorMessages.coupon_expired);
});

test("isCouponExpired treats missing expiry as never expired", () => {
  const now = new Date("2026-07-21T12:00:00.000Z");
  assert.equal(isCouponExpired(null, now), false);
  assert.equal(isCouponExpired(undefined, now), false);
  assert.equal(isCouponExpired("2026-07-21T11:59:59.000Z", now), true);
  assert.equal(isCouponExpired("2026-07-21T12:00:01.000Z", now), false);
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
      couponExpiresAt: null,
    },
  );
});

test("order search helper never uses id.ilike on uuid", () => {
  const filter = buildOrdersCustomerSearchOrFilter("Anna");
  assert.ok(filter);
  assert.match(filter, /customer_name\.ilike/);
  assert.doesNotMatch(filter, /id\.ilike/);

  assert.equal(buildOrdersCustomerSearchOrFilter("  "), null);

  const byUuid = parseOrdersQuery({
    orderId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    search: "should-be-ignored-when-eq",
  });
  assert.equal(byUuid.orderId, "f47ac10b-58cc-4372-a567-0e02b2c3d479");

  const shortRef = parseOrdersQuery({ orderId: "F47AC10B" });
  assert.equal(shortRef.orderId, "");
});

test("extractOrderCouponSummary keeps distinct totals and optional couponExpiresAt", () => {
  const summary = extractOrderCouponSummary({
    order: {
      couponCode: "SAVE20",
      discountPercentage: "20",
      subtotalPrice: "120.00",
      discountAmount: "24",
      totalPrice: "96",
      couponExpiresAt: "2026-08-01T10:00:00.000Z",
    },
  });
  assert.ok(summary);
  assert.equal(summary.subtotalPrice, 120);
  assert.equal(summary.discountAmount, 24);
  assert.equal(summary.totalPrice, 96);
  assert.equal(summary.couponExpiresAt, "2026-08-01T10:00:00.000Z");
  assert.notEqual(summary.subtotalPrice, summary.totalPrice);
});
