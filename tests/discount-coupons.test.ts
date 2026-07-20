import assert from "node:assert/strict";
import test from "node:test";

import { normalizeCouponCode } from "@/lib/checkout/coupon";
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
