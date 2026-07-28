import assert from "node:assert/strict";
import test from "node:test";

import { prepareCartLineInput, mergeCartLineForAdd } from "@/lib/cart/prepare-cart-line";
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
        id: "birch",
        label: "Брезов шперплат",
        key: "birch",
        priceDelta: 0.65,
        isDefault: true,
        isActive: true,
        isSoldOut: false,
        imageUrl: null,
        sortOrder: 0,
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
        sortOrder: 1,
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

test("A) material/stock tiers: 4.00 / 3.85 / 3.65 and cart total", () => {
  assert.equal(resolveCartLineUnitPrice(3.35, materialTiers, 1, 0.65), 4);
  assert.equal(resolveCartLineUnitPrice(3.35, materialTiers, 6, 0.65), 3.85);
  assert.equal(resolveCartLineUnitPrice(3.35, materialTiers, 11, 0.65), 3.65);

  const qty1 = prepareCartLineInput({
    product: materialProduct,
    quantity: 1,
    optionSelections: [{ groupId: "material-group", valueIds: ["birch"] }],
    unitPriceOverride: 4,
  });
  assert.ok(qty1);
  assert.equal(qty1.line.price, 4);
  assert.equal(qty1.line.optionDelta, 0.65);
  assert.equal(getCartTotals([qty1.line]).subtotal, 4);

  const qty6 = updateCartLineQuantityWithLinkedUpsells(
    [qty1.line],
    qty1.line.lineId,
    6,
  );
  assert.equal(qty6[0]?.price, 3.85);
  assert.equal(getCartTotals(qty6).subtotal, 3.85 * 6);

  const qty11 = updateCartLineQuantityWithLinkedUpsells(
    qty6,
    qty1.line.lineId,
    11,
  );
  assert.equal(qty11[0]?.price, 3.65);
  assert.equal(getCartTotals(qty11).subtotal, 3.65 * 11);
});

test("B) cart quantity update keeps optionDelta and recalculates unit/line total", () => {
  const prepared = prepareCartLineInput({
    product: materialProduct,
    quantity: 2,
    optionSelections: [{ groupId: "material-group", valueIds: ["birch"] }],
  });
  assert.ok(prepared);
  assert.equal(prepared.line.price, 4);
  assert.equal(prepared.line.optionDelta, 0.65);

  const updated = updateCartLineQuantityWithLinkedUpsells(
    [prepared.line],
    prepared.line.lineId,
    6,
  );

  assert.equal(updated[0]?.optionDelta, 0.65);
  assert.equal(updated[0]?.baseUnitPrice, 3.35);
  assert.equal(updated[0]?.price, 3.85);
  assert.equal(updated[0]?.quantity, 6);
  assert.equal(getCartTotals(updated).subtotal, 3.85 * 6);
});

test("C) multiple material variants keep own deltas; qty change preserves other line qty", () => {
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
  assert.equal(birch.line.optionDelta, 0.65);
  assert.equal(oak.line.optionDelta, 1.15);

  const birchLine = lines.find((line) => line.optionDelta === 0.65);
  const oakLine = lines.find((line) => line.optionDelta === 1.15);
  assert.ok(birchLine);
  assert.ok(oakLine);
  assert.equal(birchLine.price, 4);
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
  assert.equal(birchAfter?.optionDelta, 0.65);
  assert.equal(oakAfter?.optionDelta, 1.15);
  // Shared product tier quantity becomes 6 => both use 3.20 base + own delta
  assert.equal(birchAfter?.price, 3.85);
  assert.equal(oakAfter?.price, 4.35);
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

test("material variant price from option selections matches displayed 4.00 without override", () => {
  const prepared = prepareCartLineInput({
    product: materialProduct,
    quantity: 1,
    optionSelections: [{ groupId: "material-group", valueIds: ["birch"] }],
  });

  assert.ok(prepared);
  assert.equal(prepared.line.price, 4);
  assert.equal(prepared.line.optionDelta, 0.65);
});
