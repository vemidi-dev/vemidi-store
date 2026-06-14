import assert from "node:assert/strict";
import test from "node:test";

import {
  createOrderConfirmationPayload,
  formatOrderReference,
  parseOrderConfirmationPayload,
  parsePurchaseAnalyticsPayload,
} from "@/lib/checkout/order-confirmation";

test("formatOrderReference exposes short public reference", () => {
  const ref = formatOrderReference("a1b2c3d4-e5f6-4789-a012-3456789abcde");
  assert.equal(ref, "A1B2C3D4");
  assert.equal(ref.length, 8);
});

test("createOrderConfirmationPayload stores order ref and timestamp", () => {
  const payload = createOrderConfirmationPayload("a1b2c3d4-e5f6-4789-a012-3456789abcde");
  assert.equal(payload.orderRef, "A1B2C3D4");
  assert.ok(payload.issuedAt > 0);
});

test("parseOrderConfirmationPayload accepts valid one-time payload", () => {
  const raw = JSON.stringify({
    orderRef: "A1B2C3D4",
    issuedAt: Date.now(),
  });

  const parsed = parseOrderConfirmationPayload(raw);
  assert.ok(parsed);
  assert.equal(parsed?.orderRef, "A1B2C3D4");
});

test("parseOrderConfirmationPayload rejects expired payload", () => {
  const raw = JSON.stringify({
    orderRef: "A1B2C3D4",
    issuedAt: Date.now() - 31 * 60 * 1000,
  });

  assert.equal(parseOrderConfirmationPayload(raw), null);
});

test("parseOrderConfirmationPayload rejects invalid payload", () => {
  assert.equal(parseOrderConfirmationPayload(null), null);
  assert.equal(parseOrderConfirmationPayload("{}"), null);
  assert.equal(parseOrderConfirmationPayload('{"orderRef":"","issuedAt":1}'), null);
});

test("parsePurchaseAnalyticsPayload validates purchase event data", () => {
  const valid = parsePurchaseAnalyticsPayload(
    JSON.stringify({ value: 42.5, currency: "EUR", itemCount: 2 }),
  );
  assert.deepEqual(valid, { value: 42.5, currency: "EUR", itemCount: 2 });

  assert.equal(parsePurchaseAnalyticsPayload(null), null);
  assert.equal(
    parsePurchaseAnalyticsPayload(JSON.stringify({ value: -1, currency: "EUR", itemCount: 1 })),
    null,
  );
});
