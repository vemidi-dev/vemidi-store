import test from "node:test";
import assert from "node:assert/strict";

import type { CartLine } from "@/lib/cart-types";
import { updateCartLineQuantityWithLinkedUpsells } from "@/lib/cart/update-cart-line-quantity";

function line(overrides: Partial<CartLine>): CartLine {
  return {
    lineId: overrides.lineId ?? "line-1",
    productId: overrides.productId ?? "product-1",
    slug: overrides.slug ?? "product-1",
    title: overrides.title ?? "Product 1",
    imageSrc: overrides.imageSrc,
    price: overrides.price ?? 10,
    quantity: overrides.quantity ?? 1,
    maxCartQuantity: overrides.maxCartQuantity,
    personalization: overrides.personalization,
    personalizationFields: overrides.personalizationFields,
    selectedColors: overrides.selectedColors,
    optionSelections: overrides.optionSelections,
    upsell: overrides.upsell,
  };
}

test("increasing a main product increases linked upsell quantity limit", () => {
  const lines = [
    line({ lineId: "main", productId: "main-product", quantity: 1 }),
    line({
      lineId: "upsell",
      productId: "upsell-product",
      quantity: 1,
      maxCartQuantity: 1,
      upsell: {
        offerId: "offer-1",
        sourceProductId: "main-product",
        sourceProductTitle: "Main product",
        originalPrice: 12,
        specialPrice: 8,
        maxQuantityPerSource: 1,
      },
    }),
  ];

  const next = updateCartLineQuantityWithLinkedUpsells(lines, "main", 2);
  const upsell = next.find((item) => item.lineId === "upsell");

  assert.equal(next.find((item) => item.lineId === "main")?.quantity, 2);
  assert.equal(upsell?.quantity, 1);
  assert.equal(upsell?.maxCartQuantity, 2);
});

test("decreasing a main product clamps linked upsell quantity", () => {
  const lines = [
    line({ lineId: "main", productId: "main-product", quantity: 2 }),
    line({
      lineId: "upsell",
      productId: "upsell-product",
      quantity: 2,
      maxCartQuantity: 2,
      upsell: {
        offerId: "offer-1",
        sourceProductId: "main-product",
        sourceProductTitle: "Main product",
        originalPrice: 12,
        specialPrice: 8,
        maxQuantityPerSource: 1,
      },
    }),
  ];

  const next = updateCartLineQuantityWithLinkedUpsells(lines, "main", 1);
  const upsell = next.find((item) => item.lineId === "upsell");

  assert.equal(next.find((item) => item.lineId === "main")?.quantity, 1);
  assert.equal(upsell?.quantity, 1);
  assert.equal(upsell?.maxCartQuantity, 1);
});
