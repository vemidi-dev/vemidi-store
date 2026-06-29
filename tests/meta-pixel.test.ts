import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMetaAddToCartPayload,
  buildMetaInitiateCheckoutPayload,
  buildMetaPurchasePayload,
  buildMetaViewContentPayload,
  canSendMetaPixelEvent,
  getMetaPixelId,
  shouldLoadMetaPixel,
} from "@/lib/consent/meta-pixel";
import { normalizePreferences } from "@/lib/consent/storage";

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
});

test("meta pixel ecommerce payloads avoid PII and use product slugs", () => {
  assert.deepEqual(
    buildMetaViewContentPayload({
      slug: "darvena-kartichka",
      title: "Дървена картичка",
      price: 24.5,
    }),
    {
      content_ids: ["darvena-kartichka"],
      content_type: "product",
      content_name: "Дървена картичка",
      value: 24.5,
      currency: "EUR",
    },
  );

  assert.deepEqual(
    buildMetaAddToCartPayload({
      slug: "darvena-kartichka",
      title: "Дървена картичка",
      price: 24.5,
      quantity: 2,
    }),
    {
      content_ids: ["darvena-kartichka"],
      content_type: "product",
      content_name: "Дървена картичка",
      value: 49,
      currency: "EUR",
      num_items: 2,
    },
  );

  assert.deepEqual(
    buildMetaInitiateCheckoutPayload({
      lines: [
        { slug: "a", quantity: 1, price: 10 },
        { slug: "b", quantity: 2, price: 5 },
      ],
      subtotal: 20,
    }),
    {
      content_ids: ["a", "b"],
      content_type: "product",
      value: 20,
      currency: "EUR",
      num_items: 3,
    },
  );
});

test("buildMetaPurchasePayload includes only non-PII ecommerce fields", () => {
  assert.deepEqual(
    buildMetaPurchasePayload({
      value: 42.5,
      currency: "EUR",
      itemCount: 2,
    }),
    {
      value: 42.5,
      currency: "EUR",
      num_items: 2,
    },
  );
});

test("getMetaPixelId returns trimmed env value", () => {
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
});
