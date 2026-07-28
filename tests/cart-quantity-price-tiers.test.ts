import assert from "node:assert/strict";
import test from "node:test";

import { prepareCartLineInput, mergeCartLineForAdd } from "@/lib/cart/prepare-cart-line";
import {
  getCartLineQuantityTierGroupKey,
  sumQuantityTierGroupTotals,
} from "@/lib/cart/quantity-tier-group";
import { updateCartLineQuantityWithLinkedUpsells } from "@/lib/cart/update-cart-line-quantity";
import { getCartTotals } from "@/lib/cart-storage";
import type { CartLine } from "@/lib/cart-types";
import type { Product } from "@/lib/catalog";
import type { ProductOptionGroup } from "@/lib/product-options";
import {
  resolveCartLineUnitPrice,
  resolveQuantityTierDisplayUnitPrice,
} from "@/lib/product-quantity-pricing";
import { calculatePersonalizationDelta } from "@/lib/product-personalization";

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

const materialOptionGroups: ProductOptionGroup[] = [
  {
    id: "material-group",
    name: "Материал",
    key: "material",
    inputType: "single",
    isRequired: true,
    minSelect: 1,
    maxSelect: 1,
    sortOrder: 0,
    isActive: true,
    pricingMode: "delta",
    dependsOnOptionId: null,
    placeholder: null,
    maxLength: null,
    textPriceDelta: 0,
    values: [
      {
        id: "albasia",
        label: "Албасия",
        key: "albasia",
        priceDelta: 0,
        isDefault: true,
        isActive: true,
        isSoldOut: false,
        imageUrl: null,
        sortOrder: 0,
      },
      {
        id: "birch",
        label: "Брезов шперплат",
        key: "birch",
        priceDelta: 0.35,
        isDefault: false,
        isActive: true,
        isSoldOut: false,
        imageUrl: null,
        sortOrder: 1,
      },
      {
        id: "oak",
        label: "Дъб",
        key: "oak",
        priceDelta: 1.15,
        isDefault: false,
        isActive: true,
        isSoldOut: false,
        imageUrl: null,
        sortOrder: 2,
      },
    ],
  },
];

const materialTiers = [
  { minQuantity: 1, maxQuantity: 5, unitPrice: 3.35 },
  { minQuantity: 6, maxQuantity: 10, unitPrice: 3.2 },
  { minQuantity: 11, maxQuantity: null, unitPrice: 3 },
];

const materialProduct: Product = {
  id: "22222222-2222-4222-8222-222222222222",
  slug: "zagotovka-kosnichka",
  productCode: "VM-MAT",
  title: "Заготовка кошничка",
  description: "",
  price: 3.35,
  images: [],
  customizable: false,
  soldOut: false,
  allowQuantitySelector: true,
  quantityPriceTiers: materialTiers,
  fulfillmentType: "stocked",
  availabilityLabel: "В наличност",
  orderable: true,
  maxCartQuantity: 99,
  optionGroups: materialOptionGroups,
};

const floraSizeGroup: ProductOptionGroup = {
  id: "size-group",
  name: "Размер",
  key: "size",
  inputType: "single",
  isRequired: true,
  minSelect: 1,
  maxSelect: 1,
  sortOrder: 0,
  isActive: true,
  pricingMode: "delta",
  dependsOnOptionId: null,
  placeholder: null,
  maxLength: null,
  textPriceDelta: 0,
  values: [
    {
      id: "medium",
      label: "Средна 10x6x8",
      key: "medium",
      priceDelta: 0,
      isDefault: true,
      isActive: true,
      isSoldOut: false,
      imageUrl: null,
      sortOrder: 0,
    },
  ],
};

const floraProduct: Product = {
  ...materialProduct,
  id: "44444444-4444-4444-8444-444444444444",
  slug: "flora-kosnichka",
  productCode: "VM-FLORA",
  title: "Дървена кошничка „Флора“",
  optionGroups: [floraSizeGroup, ...materialOptionGroups],
};

const floraMediumSize = { groupId: "size-group", valueIds: ["medium"] };

function floraMaterialSelection(materialValueId: "albasia" | "birch" | "oak") {
  return [floraMediumSize, { groupId: "material-group", valueIds: [materialValueId] }];
}

function floraLilacColor() {
  return {
    fieldId: "color-field",
    fieldLabel: "Цвят",
    groupId: "color-group",
    groupKey: "color",
    groupLabel: "Цвят",
    optionId: "lilac",
    optionName: "Лилав",
    optionHex: "#9b59b6",
  };
}

function floraRedColor() {
  return {
    fieldId: "color-field",
    fieldLabel: "Цвят",
    groupId: "color-group",
    groupKey: "color",
    groupLabel: "Цвят",
    optionId: "red",
    optionName: "Червен",
    optionHex: "#c00",
  };
}

function lineTotal(line: CartLine) {
  return Math.round(line.price * line.quantity * 100) / 100;
}

const legacyPersonalizedProduct: Product = {
  id: "33333333-3333-4333-8333-333333333333",
  slug: "album-s-gravura",
  productCode: "VM-OLD",
  title: "Албум с гравюра",
  description: "",
  price: 45,
  images: [],
  customizable: true,
  soldOut: false,
  allowQuantitySelector: false,
  fulfillmentType: "made_to_order",
  availabilityLabel: "По поръчка",
  orderable: true,
  maxCartQuantity: 10,
  personalizationFields: [
    {
      id: "name-field",
      label: "Име",
      key: "name",
      type: "text",
      placeholder: null,
      maxLength: 40,
      priceDelta: 5,
      required: true,
      allowsWishTemplates: false,
    },
  ],
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

test("cart uses total product quantity for tier price across separate color lines", () => {
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

  const lines = mergeCartLineForAdd(mergeCartLineForAdd([], redLine), greenLine);

  assert.equal(lines.length, 2);
  assert.deepEqual(
    lines.map((line) => line.price),
    [8, 8],
  );
});

test("resolveQuantityTierDisplayUnitPrice adds option and personalization deltas", () => {
  assert.equal(resolveQuantityTierDisplayUnitPrice(8, 2, 1.5), 11.5);
  assert.equal(resolveQuantityTierDisplayUnitPrice(10, 0, 0), 10);
  assert.equal(resolveQuantityTierDisplayUnitPrice(7.33, 1.11, 0.56), 9);
});

test("A) material/stock tiers: 3.70 / 3.55 / 3.35 and cart total", () => {
  assert.equal(resolveCartLineUnitPrice(3.35, materialTiers, 1, 0.35), 3.7);
  assert.equal(resolveCartLineUnitPrice(3.35, materialTiers, 6, 0.35), 3.55);
  assert.equal(resolveCartLineUnitPrice(3.35, materialTiers, 11, 0.35), 3.35);

  const qty1 = prepareCartLineInput({
    product: materialProduct,
    quantity: 1,
    optionSelections: [{ groupId: "material-group", valueIds: ["birch"] }],
    unitPriceOverride: 3.7,
  });
  assert.ok(qty1);
  assert.equal(qty1.line.price, 3.7);
  assert.equal(qty1.line.optionDelta, 0.35);
  assert.equal(getCartTotals([qty1.line]).subtotal, 3.7);

  const qty6 = updateCartLineQuantityWithLinkedUpsells(
    [qty1.line],
    qty1.line.lineId,
    6,
  );
  assert.equal(qty6[0]?.price, 3.55);
  assert.equal(getCartTotals(qty6).subtotal, 3.55 * 6);

  const qty11 = updateCartLineQuantityWithLinkedUpsells(
    qty6,
    qty1.line.lineId,
    11,
  );
  assert.equal(qty11[0]?.price, 3.35);
  assert.equal(getCartTotals(qty11).subtotal, 3.35 * 11);
});

test("B) cart quantity update keeps optionDelta and recalculates unit/line total", () => {
  const prepared = prepareCartLineInput({
    product: materialProduct,
    quantity: 2,
    optionSelections: [{ groupId: "material-group", valueIds: ["birch"] }],
  });
  assert.ok(prepared);
  assert.equal(prepared.line.price, 3.7);
  assert.equal(prepared.line.optionDelta, 0.35);

  const updated = updateCartLineQuantityWithLinkedUpsells(
    [prepared.line],
    prepared.line.lineId,
    6,
  );

  assert.equal(updated[0]?.optionDelta, 0.35);
  assert.equal(updated[0]?.baseUnitPrice, 3.35);
  assert.equal(updated[0]?.price, 3.55);
  assert.equal(updated[0]?.quantity, 6);
  assert.equal(getCartTotals(updated).subtotal, 3.55 * 6);
});

test("C) multiple material variants keep own deltas and separate tier groups", () => {
  const birch = prepareCartLineInput({
    product: materialProduct,
    quantity: 1,
    optionSelections: [{ groupId: "material-group", valueIds: ["birch"] }],
  });
  const oak = prepareCartLineInput({
    product: materialProduct,
    quantity: 1,
    optionSelections: [{ groupId: "material-group", valueIds: ["oak"] }],
  });
  assert.ok(birch);
  assert.ok(oak);

  const lines = mergeCartLineForAdd(mergeCartLineForAdd([], birch), oak);
  assert.equal(lines.length, 2);
  assert.equal(birch.line.optionDelta, 0.35);
  assert.equal(oak.line.optionDelta, 1.15);

  const birchLine = lines.find((line) => line.optionDelta === 0.35);
  const oakLine = lines.find((line) => line.optionDelta === 1.15);
  assert.ok(birchLine);
  assert.ok(oakLine);
  assert.equal(birchLine.price, 3.7);
  assert.equal(oakLine.price, 4.5);

  const afterBirchQty = updateCartLineQuantityWithLinkedUpsells(
    lines,
    birchLine.lineId,
    5,
  );
  const birchAfter = afterBirchQty.find((line) => line.lineId === birchLine.lineId);
  const oakAfter = afterBirchQty.find((line) => line.lineId === oakLine.lineId);

  assert.equal(birchAfter?.quantity, 5);
  assert.equal(oakAfter?.quantity, 1);
  assert.equal(birchAfter?.optionDelta, 0.35);
  assert.equal(oakAfter?.optionDelta, 1.15);
  // Each material has its own tier group — birch qty 5 stays on tier 1-5, oak stays at qty 1
  assert.equal(birchAfter?.price, 3.7);
  assert.equal(oakAfter?.price, 4.5);
});

test("D) legacy personalized product keeps price + personalization delta without tiers", () => {
  const personalizationFields = [
    {
      fieldId: "name-field",
      fieldKey: "name",
      label: "Име",
      value: "Мария",
    },
  ];
  assert.equal(
    calculatePersonalizationDelta(
      legacyPersonalizedProduct.personalizationFields,
      personalizationFields,
    ),
    5,
  );

  const prepared = prepareCartLineInput({
    product: legacyPersonalizedProduct,
    quantity: 1,
    personalizationFields,
  });
  assert.ok(prepared);
  assert.equal(prepared.line.price, 50);
  assert.equal(prepared.line.personalizationDelta, 5);
  assert.equal(prepared.line.optionDelta, 0);
  assert.deepEqual(prepared.line.quantityPriceTiers, []);

  const updated = updateCartLineQuantityWithLinkedUpsells(
    [prepared.line],
    prepared.line.lineId,
    2,
  );
  assert.equal(updated[0]?.price, 50);
  assert.equal(updated[0]?.quantity, 2);
  assert.equal(getCartTotals(updated).subtotal, 100);
});

test("E) legacy cart line without pricing metadata keeps unit price on qty update", () => {
  const legacyLine: CartLine = {
    lineId: "legacy-line",
    productId: materialProduct.id,
    slug: materialProduct.slug,
    title: materialProduct.title,
    price: 4,
    quantity: 1,
    quantityPriceTiers: materialTiers,
    // intentionally no baseUnitPrice / optionDelta
  };

  const updated = updateCartLineQuantityWithLinkedUpsells(
    [legacyLine],
    legacyLine.lineId,
    6,
  );

  assert.equal(updated[0]?.quantity, 6);
  assert.equal(updated[0]?.price, 4);
  assert.equal(getCartTotals(updated).subtotal, 24);
});

test("material variant price from option selections matches displayed 3.70 without override", () => {
  const prepared = prepareCartLineInput({
    product: materialProduct,
    quantity: 1,
    optionSelections: [{ groupId: "material-group", valueIds: ["birch"] }],
  });

  assert.ok(prepared);
  assert.equal(prepared.line.price, 3.7);
  assert.equal(prepared.line.optionDelta, 0.35);
});

test("manual regression: Flora basket — different materials do not share quantity tier", () => {
  const albasia = prepareCartLineInput({
    product: floraProduct,
    quantity: 5,
    optionSelections: floraMaterialSelection("albasia"),
    selectedColors: [floraLilacColor()],
  });
  const birch = prepareCartLineInput({
    product: floraProduct,
    quantity: 2,
    optionSelections: floraMaterialSelection("birch"),
    selectedColors: [floraLilacColor()],
  });
  assert.ok(albasia);
  assert.ok(birch);

  const lines = mergeCartLineForAdd(mergeCartLineForAdd([], albasia), birch);
  const albasiaLine = lines.find((line) => line.optionDelta === 0);
  const birchLine = lines.find((line) => line.optionDelta === 0.35);
  assert.ok(albasiaLine);
  assert.ok(birchLine);

  const albasiaKey = getCartLineQuantityTierGroupKey(albasiaLine);
  const birchKey = getCartLineQuantityTierGroupKey(birchLine);
  assert.ok(albasiaKey);
  assert.ok(birchKey);
  assert.notEqual(albasiaKey, birchKey);
  assert.notEqual(albasiaKey, `${floraProduct.id}::p:0`);

  const groupTotals = sumQuantityTierGroupTotals(lines);
  assert.equal(groupTotals.get(albasiaKey!), 5);
  assert.equal(groupTotals.get(birchKey!), 2);

  assert.equal(albasiaLine.price, 3.35);
  assert.equal(albasiaLine.quantity, 5);
  assert.equal(lineTotal(albasiaLine), 16.75);
  assert.equal(birchLine.price, 3.7);
  assert.equal(birchLine.quantity, 2);
  assert.equal(lineTotal(birchLine), 7.4);
  assert.equal(getCartTotals(lines).subtotal, 24.15);

  // Wrong product-wide grouping would apply tier 6–10 (3.20 base) to both lines.
  assert.notEqual(albasiaLine.price, 3.2);
  assert.notEqual(birchLine.price, 3.55);
});

test("manual regression: Flora basket — same material different colors share quantity tier", () => {
  const lilac = prepareCartLineInput({
    product: floraProduct,
    quantity: 5,
    optionSelections: floraMaterialSelection("albasia"),
    selectedColors: [floraLilacColor()],
  });
  const red = prepareCartLineInput({
    product: floraProduct,
    quantity: 2,
    optionSelections: floraMaterialSelection("albasia"),
    selectedColors: [floraRedColor()],
  });
  assert.ok(lilac);
  assert.ok(red);

  const lines = mergeCartLineForAdd(mergeCartLineForAdd([], lilac), red);
  assert.equal(lines.length, 2);

  const lilacLine = lines.find((line) =>
    line.selectedColors?.some((color) => color.optionId === "lilac"),
  );
  const redLine = lines.find((line) =>
    line.selectedColors?.some((color) => color.optionId === "red"),
  );
  assert.ok(lilacLine);
  assert.ok(redLine);

  const groupKey = getCartLineQuantityTierGroupKey(lilacLine);
  assert.equal(getCartLineQuantityTierGroupKey(redLine), groupKey);
  assert.equal(sumQuantityTierGroupTotals(lines).get(groupKey!), 7);

  assert.equal(lilacLine.price, 3.2);
  assert.equal(redLine.price, 3.2);
  assert.equal(lineTotal(lilacLine), 16);
  assert.equal(lineTotal(redLine), 6.4);
  assert.equal(getCartTotals(lines).subtotal, 22.4);
});

test("quantity tier group key groups by product + options, not color or productId alone", () => {
  const albasiaLilac = prepareCartLineInput({
    product: floraProduct,
    quantity: 1,
    optionSelections: floraMaterialSelection("albasia"),
    selectedColors: [floraLilacColor()],
  });
  const albasiaRed = prepareCartLineInput({
    product: floraProduct,
    quantity: 1,
    optionSelections: floraMaterialSelection("albasia"),
    selectedColors: [floraRedColor()],
  });
  const birchLilac = prepareCartLineInput({
    product: floraProduct,
    quantity: 1,
    optionSelections: floraMaterialSelection("birch"),
    selectedColors: [floraLilacColor()],
  });
  assert.ok(albasiaLilac);
  assert.ok(albasiaRed);
  assert.ok(birchLilac);

  const albasiaLilacKey = getCartLineQuantityTierGroupKey(albasiaLilac.line);
  const albasiaRedKey = getCartLineQuantityTierGroupKey(albasiaRed.line);
  const birchLilacKey = getCartLineQuantityTierGroupKey(birchLilac.line);

  assert.equal(albasiaLilacKey, albasiaRedKey);
  assert.notEqual(albasiaLilacKey, birchLilacKey);
  assert.ok(albasiaLilacKey?.includes(floraProduct.id));
  assert.ok(albasiaLilacKey?.includes("material-group:albasia"));
  assert.ok(birchLilacKey?.includes("material-group:birch"));
  assert.ok(!albasiaLilacKey?.includes("lilac"));
  assert.ok(!albasiaLilacKey?.includes("red"));
});

test("F) different materials do not share quantity tier (Flora basket)", () => {
  const albasia = prepareCartLineInput({
    product: materialProduct,
    quantity: 5,
    optionSelections: [{ groupId: "material-group", valueIds: ["albasia"] }],
    selectedColors: [
      {
        fieldId: "color-field",
        fieldLabel: "Цвят",
        groupId: "color-group",
        groupKey: "color",
        groupLabel: "Цвят",
        optionId: "lilac",
        optionName: "Лилав",
        optionHex: "#9b59b6",
      },
    ],
  });
  const birch = prepareCartLineInput({
    product: materialProduct,
    quantity: 2,
    optionSelections: [{ groupId: "material-group", valueIds: ["birch"] }],
    selectedColors: [
      {
        fieldId: "color-field",
        fieldLabel: "Цвят",
        groupId: "color-group",
        groupKey: "color",
        groupLabel: "Цвят",
        optionId: "lilac",
        optionName: "Лилав",
        optionHex: "#9b59b6",
      },
    ],
  });
  assert.ok(albasia);
  assert.ok(birch);

  const lines = mergeCartLineForAdd(mergeCartLineForAdd([], albasia), birch);
  const albasiaLine = lines.find((line) => line.optionDelta === 0);
  const birchLine = lines.find((line) => line.optionDelta === 0.35);
  assert.ok(albasiaLine);
  assert.ok(birchLine);

  assert.equal(albasiaLine.price, 3.35);
  assert.equal(albasiaLine.quantity, 5);
  assert.equal(birchLine.price, 3.7);
  assert.equal(birchLine.quantity, 2);
  assert.equal(getCartTotals(lines).subtotal, 16.75 + 7.4);
});

test("G) same material different colors share quantity tier", () => {
  const lilac = prepareCartLineInput({
    product: materialProduct,
    quantity: 5,
    optionSelections: [{ groupId: "material-group", valueIds: ["albasia"] }],
    selectedColors: [
      {
        fieldId: "color-field",
        fieldLabel: "Цвят",
        groupId: "color-group",
        groupKey: "color",
        groupLabel: "Цвят",
        optionId: "lilac",
        optionName: "Лилав",
        optionHex: "#9b59b6",
      },
    ],
  });
  const red = prepareCartLineInput({
    product: materialProduct,
    quantity: 2,
    optionSelections: [{ groupId: "material-group", valueIds: ["albasia"] }],
    selectedColors: [
      {
        fieldId: "color-field",
        fieldLabel: "Цвят",
        groupId: "color-group",
        groupKey: "color",
        groupLabel: "Цвят",
        optionId: "red",
        optionName: "Червен",
        optionHex: "#c00",
      },
    ],
  });
  assert.ok(lilac);
  assert.ok(red);

  const lines = mergeCartLineForAdd(mergeCartLineForAdd([], lilac), red);
  assert.equal(lines.length, 2);
  assert.deepEqual(
    lines.map((line) => line.price),
    [3.2, 3.2],
  );
  assert.equal(getCartTotals(lines).subtotal, 3.2 * 5 + 3.2 * 2);
});

test("H) different material deltas create separate pricing groups on add", () => {
  const albasia = prepareCartLineInput({
    product: materialProduct,
    quantity: 6,
    optionSelections: [{ groupId: "material-group", valueIds: ["albasia"] }],
  });
  const birch = prepareCartLineInput({
    product: materialProduct,
    quantity: 6,
    optionSelections: [{ groupId: "material-group", valueIds: ["birch"] }],
  });
  assert.ok(albasia);
  assert.ok(birch);

  const lines = mergeCartLineForAdd(mergeCartLineForAdd([], albasia), birch);
  const albasiaLine = lines.find((line) => line.optionDelta === 0);
  const birchLine = lines.find((line) => line.optionDelta === 0.35);
  assert.ok(albasiaLine);
  assert.ok(birchLine);

  assert.equal(albasiaLine.price, 3.2);
  assert.equal(birchLine.price, 3.55);
  assert.equal(getCartTotals(lines).subtotal, 3.2 * 6 + 3.55 * 6);
});
