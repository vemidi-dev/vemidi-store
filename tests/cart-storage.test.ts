import assert from "node:assert/strict";
import test from "node:test";

import { makeCartLineId } from "@/lib/cart-line-id";
import {
  MAX_CART_QUANTITY,
  getCartTotals,
  normalizeCartQuantity,
  parseStoredCart,
} from "@/lib/cart-storage";
import type { CartLine } from "@/lib/cart-types";
import type { SelectedProductColor } from "@/lib/product-colors";

const blue: SelectedProductColor = {
  fieldId: "ribbon",
  fieldLabel: "Цвят на панделката",
  groupId: "ribbon-group",
  groupKey: "ribbon",
  groupLabel: "Панделка",
  optionId: "blue",
  optionName: "Син",
  optionHex: "#315a73",
};

const gold: SelectedProductColor = {
  fieldId: "engraving",
  fieldLabel: "Цвят на гравюрата",
  groupId: "engraving-group",
  groupKey: "engraving",
  groupLabel: "Гравюра",
  optionId: "gold",
  optionName: "Златист",
  optionHex: "#b28a52",
};

test("makeCartLineId is stable for the same personalization and options", () => {
  const first = makeCartLineId("gift-box", "  За Мария  ", [blue, gold]);
  const second = makeCartLineId("gift-box", "За Мария", [gold, blue]);

  assert.equal(first, second);
  assert.notEqual(first, makeCartLineId("gift-box", "За Иван", [gold, blue]));
  assert.notEqual(first, makeCartLineId("gift-box", "За Мария", [blue]));
});

test("makeCartLineId uses structured personalization values when available", () => {
  const first = makeCartLineId("gift-box", "legacy summary", [blue], [
    {
      fieldId: "date",
      fieldKey: "date",
      label: "Дата",
      value: "2026-06-09",
    },
    {
      fieldId: "name",
      fieldKey: "name",
      label: "Име",
      value: "Мария",
    },
  ]);
  const second = makeCartLineId("gift-box", "different summary", [blue], [
    {
      fieldId: "name",
      fieldKey: "name",
      label: "Име",
      value: "Мария",
    },
    {
      fieldId: "date",
      fieldKey: "date",
      label: "Дата",
      value: "2026-06-09",
    },
  ]);

  assert.equal(first, second);
});

test("normalizeCartQuantity rejects invalid values and applies cart limits", () => {
  assert.equal(normalizeCartQuantity(Number.NaN), 0);
  assert.equal(normalizeCartQuantity(Number.POSITIVE_INFINITY), 0);
  assert.equal(normalizeCartQuantity(-2), 0);
  assert.equal(normalizeCartQuantity(2.9), 2);
  assert.equal(normalizeCartQuantity(500), MAX_CART_QUANTITY);
});

test("parseStoredCart safely ignores malformed or unsafe lines", () => {
  const stored = JSON.stringify([
    {
      productId: "11111111-1111-4111-8111-111111111111",
      slug: "valid-product",
      title: "Валиден продукт",
      imageSrc: "/assets/product.webp",
      price: 12.5,
      quantity: 120,
      campaign: "  Butterflies Summer  ",
      personalization: "  За Мария  ",
      personalizationFields: [
        {
          fieldId: "name",
          fieldKey: "name",
          label: "Име",
          value: "  Мария  ",
        },
        { fieldId: "", fieldKey: "bad", label: "Bad", value: "Bad" },
      ],
      selectedColors: [blue, { optionId: "missing-fields" }],
    },
    {
      productId: "22222222-2222-4222-8222-222222222222",
      slug: "negative-price",
      title: "Невалиден",
      price: -1,
      quantity: 1,
    },
    {
      productId: "33333333-3333-4333-8333-333333333333",
      slug: "zero-quantity",
      title: "Невалиден",
      price: 10,
      quantity: 0,
    },
    { slug: "", title: "Невалиден", price: 10, quantity: 1 },
    null,
  ]);

  const lines = parseStoredCart(stored);

  assert.equal(lines.length, 1);
  assert.equal(lines[0].productId, "11111111-1111-4111-8111-111111111111");
  assert.equal(lines[0].slug, "valid-product");
  assert.equal(lines[0].quantity, MAX_CART_QUANTITY);
  assert.equal(lines[0].campaign, "butterflies-summer");
  assert.equal(lines[0].imageSrc, "/assets/product.webp");
  assert.equal(lines[0].personalization, "За Мария");
  assert.deepEqual(lines[0].personalizationFields, [
    {
      fieldId: "name",
      fieldKey: "name",
      label: "Име",
      value: "Мария",
    },
  ]);
  assert.deepEqual(lines[0].selectedColors, [blue]);
  assert.equal(
    lines[0].lineId,
    makeCartLineId(
      "11111111-1111-4111-8111-111111111111",
      "За Мария",
      [blue],
      lines[0].personalizationFields,
    ),
  );
});

test("parseStoredCart returns an empty cart for invalid JSON and non-arrays", () => {
  assert.deepEqual(parseStoredCart(null), []);
  assert.deepEqual(parseStoredCart("{broken"), []);
  assert.deepEqual(parseStoredCart(JSON.stringify({ slug: "product" })), []);
});

test("getCartTotals calculates item count and subtotal", () => {
  const lines: CartLine[] = [
    {
      lineId: "one",
      productId: "11111111-1111-4111-8111-111111111111",
      slug: "one",
      title: "Първи продукт",
      price: 12.5,
      quantity: 2,
    },
    {
      lineId: "two",
      productId: "22222222-2222-4222-8222-222222222222",
      slug: "two",
      title: "Втори продукт",
      price: 8,
      quantity: 3,
    },
  ];

  assert.deepEqual(getCartTotals(lines), {
    itemCount: 5,
    subtotal: 49,
  });
});
