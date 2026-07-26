import assert from "node:assert/strict";
import test from "node:test";

import { prepareCartLineInput } from "@/lib/cart/prepare-cart-line";
import { mergeCartLineForAdd } from "@/lib/cart/prepare-cart-line";
import { updateCartLineQuantityWithLinkedUpsells } from "@/lib/cart/update-cart-line-quantity";
import type { Product } from "@/lib/catalog";

const product: Product = {
  id: "11111111-1111-4111-8111-111111111111",
  slug: "tier-product",
  productCode: "VM-TEST",
  title: "Продукт с цени по количество",
  description: "",
  price: 10,
  images: [],
  customizable: false,
  soldOut: false,
  allowQuantitySelector: true,
  quantityPriceTiers: [
    { minQuantity: 1, maxQuantity: 5, unitPrice: 10 },
    { minQuantity: 6, maxQuantity: null, unitPrice: 8 },
  ],
  fulfillmentType: "stocked",
  availabilityLabel: "В наличност",
  orderable: true,
  maxCartQuantity: 20,
};

test("cart line uses quantity tier price when quantity changes", () => {
  const prepared = prepareCartLineInput({ product, quantity: 2 });

  assert.ok(prepared);
  assert.equal(prepared.line.price, 10);

  const [updated] = updateCartLineQuantityWithLinkedUpsells(
    [prepared.line],
    prepared.line.lineId,
    6,
  );

  assert.equal(updated?.quantity, 6);
  assert.equal(updated?.price, 8);
});

test("cart uses total product quantity for tier price across separate lines", () => {
  const redLine = prepareCartLineInput({
    product,
    quantity: 2,
    selectedColors: [
      {
        fieldId: "field",
        fieldLabel: "Цвят",
        groupId: "group",
        groupKey: "color",
        groupLabel: "Цвят",
        optionId: "red",
        optionName: "Червен",
        optionHex: "#c00",
      },
    ],
  });
  const greenLine = prepareCartLineInput({
    product,
    quantity: 4,
    selectedColors: [
      {
        fieldId: "field",
        fieldLabel: "Цвят",
        groupId: "group",
        groupKey: "color",
        groupLabel: "Цвят",
        optionId: "green",
        optionName: "Зелен",
        optionHex: "#090",
      },
    ],
  });

  assert.ok(redLine);
  assert.ok(greenLine);

  const lines = mergeCartLineForAdd(
    mergeCartLineForAdd([], redLine),
    greenLine,
  );

  assert.equal(lines.length, 2);
  assert.deepEqual(
    lines.map((line) => line.price),
    [8, 8],
  );
});
