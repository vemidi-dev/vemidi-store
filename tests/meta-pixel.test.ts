import assert from "node:assert/strict";
import test from "node:test";

import {
  assertNoPiiInMetaPayload,
  buildMetaAddToCartPayload,
  buildMetaInitiateCheckoutPayload,
  buildMetaPurchasePayload,
  buildMetaViewContentPayload,
  canSendMetaPixelEvent,
  getMetaPixelId,
  resolveMetaPurchaseEventId,
  shouldLoadMetaPixel,
} from "@/lib/consent/meta-pixel";
import { normalizePreferences } from "@/lib/consent/storage";
import { parsePurchaseAnalyticsPayload } from "@/lib/checkout/order-confirmation";

test("shouldLoadMetaPixel requires marketing consent and pixel ID", () => {
  assert.equal(
    shouldLoadMetaPixel(
      normalizePreferences({ marketing: true }),
      "1234567890",
    ),
    true,
  );
  assert.equal(
    shouldLoadMetaPixel(
      normalizePreferences({ marketing: false }),
      "1234567890",
    ),
    false,
  );
  assert.equal(
    shouldLoadMetaPixel(normalizePreferences({ marketing: true }), ""),
    false,
  );
  assert.equal(
    shouldLoadMetaPixel(normalizePreferences({ marketing: true }), undefined),
    false,
  );
  assert.equal(shouldLoadMetaPixel(null, "1234567890"), false);
});

test("canSendMetaPixelEvent requires fbq and marketing consent", () => {
  assert.equal(
    canSendMetaPixelEvent(
      normalizePreferences({ marketing: true }),
      "1234567890",
      true,
    ),
    true,
  );
  assert.equal(
    canSendMetaPixelEvent(
      normalizePreferences({ marketing: true }),
      "1234567890",
      false,
    ),
    false,
  );
  assert.equal(
    canSendMetaPixelEvent(
      normalizePreferences({ marketing: false }),
      "1234567890",
      true,
    ),
    false,
  );
  assert.equal(
    canSendMetaPixelEvent(
      normalizePreferences({ marketing: true }),
      undefined,
      true,
    ),
    false,
  );
});

test("meta pixel ecommerce payloads avoid PII and use product slugs", () => {
  const viewContent = buildMetaViewContentPayload({
    slug: "darvena-kartichka",
    title: "Дървена картичка",
    price: 24.5,
  });
  assert.deepEqual(viewContent, {
    content_ids: ["darvena-kartichka"],
    content_type: "product",
    content_name: "Дървена картичка",
    contents: [
      { id: "darvena-kartichka", quantity: 1, item_price: 24.5 },
    ],
    value: 24.5,
    currency: "EUR",
  });
  assert.deepEqual(assertNoPiiInMetaPayload(viewContent), []);

  const addToCart = buildMetaAddToCartPayload({
    slug: "darvena-kartichka",
    title: "Дървена картичка",
    price: 24.5,
    quantity: 2,
  });
  assert.deepEqual(addToCart, {
    content_ids: ["darvena-kartichka"],
    content_type: "product",
    content_name: "Дървена картичка",
    contents: [
      { id: "darvena-kartichka", quantity: 2, item_price: 24.5 },
    ],
    value: 49,
    currency: "EUR",
    num_items: 2,
  });
  assert.deepEqual(assertNoPiiInMetaPayload(addToCart), []);

  const initiateCheckout = buildMetaInitiateCheckoutPayload({
    lines: [
      { slug: "a", quantity: 1, price: 10 },
      { slug: "b", quantity: 2, price: 5 },
    ],
    subtotal: 20,
  });
  assert.deepEqual(initiateCheckout, {
    content_ids: ["a", "b"],
    content_type: "product",
    contents: [
      { id: "a", quantity: 1, item_price: 10 },
      { id: "b", quantity: 2, item_price: 5 },
    ],
    value: 20,
    currency: "EUR",
    num_items: 3,
  });
  assert.deepEqual(assertNoPiiInMetaPayload(initiateCheckout), []);
});

test("buildMetaPurchasePayload includes content ids contents and no PII", () => {
  const purchase = buildMetaPurchasePayload({
    value: 42.5,
    currency: "EUR",
    itemCount: 2,
    contentIds: ["a", "b"],
    contents: [
      { id: "a", quantity: 1, item_price: 20 },
      { id: "b", quantity: 1, item_price: 22.5 },
    ],
  });

  assert.deepEqual(purchase, {
    value: 42.5,
    currency: "EUR",
    num_items: 2,
    content_ids: ["a", "b"],
    content_type: "product",
    contents: [
      { id: "a", quantity: 1, item_price: 20 },
      { id: "b", quantity: 1, item_price: 22.5 },
    ],
  });
  assert.deepEqual(assertNoPiiInMetaPayload(purchase), []);
  assert.equal("email" in purchase, false);
  assert.equal("phone" in purchase, false);
  assert.equal("customer_name" in purchase, false);
});

test("purchase analytics parser keeps optional orderRef and contentIds", () => {
  const parsed = parsePurchaseAnalyticsPayload(
    JSON.stringify({
      value: 42.5,
      currency: "EUR",
      itemCount: 2,
      orderRef: "A1B2C3D4",
      contentIds: ["demo-product"],
      contents: [{ id: "demo-product", quantity: 2, item_price: 21.25 }],
    }),
  );

  assert.deepEqual(parsed, {
    value: 42.5,
    currency: "EUR",
    itemCount: 2,
    orderRef: "A1B2C3D4",
    contentIds: ["demo-product"],
    contents: [{ id: "demo-product", quantity: 2, item_price: 21.25 }],
  });
  assert.equal(resolveMetaPurchaseEventId(parsed?.orderRef), "A1B2C3D4");
  assert.equal(resolveMetaPurchaseEventId("  "), undefined);
});

test("getMetaPixelId returns trimmed env value and empty when unset", () => {
  const previous = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  process.env.NEXT_PUBLIC_META_PIXEL_ID = "  1234567890  ";

  try {
    assert.equal(getMetaPixelId(), "1234567890");
  } finally {
    if (previous === undefined) {
      delete process.env.NEXT_PUBLIC_META_PIXEL_ID;
    } else {
      process.env.NEXT_PUBLIC_META_PIXEL_ID = previous;
    }
  }

  const previousEmpty = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  delete process.env.NEXT_PUBLIC_META_PIXEL_ID;
  try {
    assert.equal(getMetaPixelId(), undefined);
    assert.equal(
      shouldLoadMetaPixel(normalizePreferences({ marketing: true })),
      false,
    );
  } finally {
    if (previousEmpty === undefined) {
      delete process.env.NEXT_PUBLIC_META_PIXEL_ID;
    } else {
      process.env.NEXT_PUBLIC_META_PIXEL_ID = previousEmpty;
    }
  }
});

test("assertNoPiiInMetaPayload flags forbidden keys", () => {
  assert.deepEqual(
    assertNoPiiInMetaPayload({
      value: 1,
      email: "a@b.c",
      phone: "0888",
    }),
    ["email", "phone"],
  );
});
