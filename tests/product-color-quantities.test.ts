import assert from "node:assert/strict";
import test from "node:test";

import { buildStoreOrderItemDetailLines } from "@/lib/admin/order-item-display";
import { makeCartLineId } from "@/lib/cart-line-id";
import { resolveCartLineSummaryRows } from "@/lib/cart/cart-line-summary";
import type { CartLine } from "@/lib/cart-types";
import {
  mergeProductConfigurationDraft,
  parseProductConfigurationDraft,
} from "@/lib/product-configuration-draft";
import {
  flattenSelectedColorsFromQuantities,
  formatSelectedColorsQuantitySummary,
  validateColorQuantities,
} from "@/lib/product-color-quantities";
import type { ProductColorField, SelectedProductColor } from "@/lib/product-colors";

const quantityField: ProductColorField = {
  id: "roses-field",
  label: "Рози",
  key: "rose",
  groupId: "rose-group",
  groupLabel: "Рози",
  minSelect: 1,
  maxSelect: 1,
  selectionMode: "quantity",
  requiredTotalQuantity: 12,
  options: [
    { id: "red", name: "Червени", hex: "#c00" },
    { id: "white", name: "Бели", hex: "#fff" },
    { id: "pink", name: "Розови", hex: "#f9c" },
  ],
};

const redFive: SelectedProductColor = {
  fieldId: "roses-field",
  fieldLabel: "Рози",
  groupId: "rose-group",
  groupKey: "rose",
  groupLabel: "Рози",
  optionId: "red",
  optionName: "Червени",
  optionHex: "#c00",
  quantity: 5,
};

const whiteFour: SelectedProductColor = {
  ...redFive,
  optionId: "white",
  optionName: "Бели",
  optionHex: "#fff",
  quantity: 4,
};

const pinkThree: SelectedProductColor = {
  ...redFive,
  optionId: "pink",
  optionName: "Розови",
  optionHex: "#f9c",
  quantity: 3,
};

const bouquetColors = [redFive, whiteFour, pinkThree];

test("validateColorQuantities requires exact total for bouquet mode", () => {
  assert.equal(
    validateColorQuantities(quantityField, { red: 5, white: 4, pink: 2 }),
    "Изберете точно 12 броя за „Рози“ (избрани 11 от 12).",
  );
  assert.equal(
    validateColorQuantities(quantityField, { red: 5, white: 4, pink: 3 }),
    null,
  );
});

test("makeCartLineId distinguishes different quantity mixes", () => {
  const mixA = makeCartLineId("bouquet", undefined, [redFive, whiteFour, pinkThree]);
  const mixB = makeCartLineId("bouquet", undefined, [
    { ...redFive, quantity: 6 },
    { ...whiteFour, quantity: 3 },
    { ...pinkThree, quantity: 3 },
  ]);

  assert.notEqual(mixA, mixB);
  assert.match(mixA, /roses-field:red:5/);
});

test("cart and admin displays summarize quantities per color", () => {
  const colors = bouquetColors;
  assert.equal(
    formatSelectedColorsQuantitySummary(colors),
    "Червени × 5, Бели × 4, Розови × 3",
  );

  const line: CartLine = {
    lineId: "line-1",
    productId: "bouquet",
    slug: "bouquet",
    title: "Букет",
    price: 40,
    quantity: 1,
    selectedColors: colors,
  };

  assert.deepEqual(resolveCartLineSummaryRows(line), [{
    label: "Рози",
    value: "Червени × 5, Бели × 4, Розови × 3",
  }]);

  assert.deepEqual(buildStoreOrderItemDetailLines({
    personalization: null,
    personalizationFields: [],
    selectedColors: colors,
    optionSelections: [],
  }), [{
    text: "Рози: Червени × 5, Бели × 4, Розови × 3",
  }]);
});

test("draft restore keeps quantity selections from storage and cart merge", () => {
  const draft = parseProductConfigurationDraft(JSON.stringify({
    values: {},
    enabledOptionalFieldIds: [],
    selectedColorOptionIdsByFieldId: {},
    selectedColorQuantitiesByFieldId: {
      "roses-field": { red: 5, white: 4, pink: 3 },
    },
    optionSelections: [],
  }));

  assert.deepEqual(draft?.selectedColorQuantitiesByFieldId, {
    "roses-field": { red: 5, white: 4, pink: 3 },
  });

  const merged = mergeProductConfigurationDraft({
    values: {},
    enabledOptionalFieldIds: [],
    selectedColorOptionIdsByFieldId: {},
    selectedColorQuantitiesByFieldId: {},
    optionSelections: [],
  }, {
    selectedColors: [redFive, whiteFour, pinkThree],
  });

  assert.deepEqual(merged.selectedColorQuantitiesByFieldId, {
    "roses-field": { red: 5, white: 4, pink: 3 },
  });

  assert.deepEqual(
    flattenSelectedColorsFromQuantities([quantityField], merged.selectedColorQuantitiesByFieldId),
    bouquetColors,
  );
});
