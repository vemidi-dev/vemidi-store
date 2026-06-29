import assert from "node:assert/strict";
import test from "node:test";

import { mapCheckoutError } from "@/lib/checkout/errors";
import {
  validateCheckoutDelivery,
  validateCustomerEmail,
  validateCustomerName,
  validateCustomerPhone,
  validateIdempotencyKey,
  validatePrivacyConsent,
} from "@/lib/checkout/validation";

test("privacy consent is required", () => {
  assert.equal(validatePrivacyConsent("on"), true);
  assert.equal(validatePrivacyConsent(null), false);
});

test("customer validation catches invalid name phone and email", () => {
  assert.equal(validateCustomerName("А"), false);
  assert.equal(validateCustomerName("Анна Иванова"), true);
  assert.equal(validateCustomerPhone("123"), false);
  assert.equal(validateCustomerPhone("+359881234567"), true);
  assert.equal(validateCustomerEmail(""), false);
  assert.equal(validateCustomerEmail("invalid"), false);
  assert.equal(validateCustomerEmail("shop@example.com"), true);
});

test("idempotency key must be uuid v4", () => {
  assert.equal(validateIdempotencyKey("not-a-uuid"), false);
  assert.equal(
    validateIdempotencyKey("f47ac10b-58cc-4372-a567-0e02b2c3d479"),
    true,
  );
});

test("delivery validation catches invalid courier type and address", () => {
  assert.equal(
    validateCheckoutDelivery({
      courier: "dhl",
      deliveryType: "address",
      city: "София",
      officeOrPostcode: "",
      details: "ул. Витоша 1",
    }),
    "invalid_courier",
  );

  assert.equal(
    validateCheckoutDelivery({
      courier: "econt",
      deliveryType: "pickup",
      city: "София",
      officeOrPostcode: "",
      details: "ул. Витоша 1",
    } as never),
    "invalid_delivery_type",
  );

  assert.equal(
    validateCheckoutDelivery({
      courier: "econt",
      deliveryType: "address",
      city: "София",
      officeOrPostcode: "",
      details: "abc",
    }),
    "address_required",
  );

  assert.equal(
    validateCheckoutDelivery({
      courier: "econt",
      deliveryType: "office",
      city: "София",
      officeOrPostcode: "",
      details: "",
    }),
    "office_required",
  );
});

test("mapCheckoutError localizes rpc inventory and checkout failures", () => {
  assert.match(mapCheckoutError("insufficient_stock"), /наличност/);
  assert.match(mapCheckoutError("product_unavailable"), /не може да бъде поръчан/);
  assert.match(mapCheckoutError("product_sold_out"), /изчерпан/);
  assert.match(mapCheckoutError("empty_order"), /празна/);
  assert.match(mapCheckoutError("invalid_product_price"), /потвърдена/i);
  assert.match(mapCheckoutError("order_request_in_progress"), /обработва/);
  assert.match(mapCheckoutError("unknown_code"), /опитайте отново/);
});
