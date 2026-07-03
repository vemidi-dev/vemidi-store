import test from "node:test";
import assert from "node:assert/strict";

import type { CartLine } from "@/lib/cart-types";
import { removeCartLineWithLinkedUpsells } from "@/lib/cart/remove-cart-line";

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

test("removing a main product removes linked upsell lines", () => {
  const lines = [
    line({ lineId: "main", productId: "main-product" }),
    line({
      lineId: "linked-upsell",
      productId: "upsell-product",
      upsell: {
        offerId: "offer-1",
        sourceProductId: "main-product",
        sourceProductTitle: "Main product",
        originalPrice: 12,
        specialPrice: 8,
      },
    }),
    line({
      lineId: "other-upsell",
      productId: "other-upsell-product",
      upsell: {
        offerId: "offer-2",
        sourceProductId: "other-main-product",
        sourceProductTitle: "Other main product",
        originalPrice: 14,
        specialPrice: 9,
      },
    }),
  ];

  assert.deepEqual(
    removeCartLineWithLinkedUpsells(lines, "main").map((item) => item.lineId),
    ["other-upsell"],
  );
});

test("removing an upsell line keeps its main product", () => {
  const lines = [
    line({ lineId: "main", productId: "main-product" }),
    line({
      lineId: "linked-upsell",
      productId: "upsell-product",
      upsell: {
        offerId: "offer-1",
        sourceProductId: "main-product",
        sourceProductTitle: "Main product",
        originalPrice: 12,
        specialPrice: 8,
      },
    }),
  ];

  assert.deepEqual(
    removeCartLineWithLinkedUpsells(lines, "linked-upsell").map(
      (item) => item.lineId,
    ),
    ["main"],
  );
});
