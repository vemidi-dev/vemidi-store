import assert from "node:assert/strict";
import test from "node:test";

import { toProduct, type ProductRow } from "@/lib/storefront/mappers";
import type { ProductPromotionRow } from "@/lib/product-pricing";
import { prepareCartLineInput, mergeCartLineForAdd } from "@/lib/cart/prepare-cart-line";
import { updateCartLineQuantityWithLinkedUpsells } from "@/lib/cart/update-cart-line-quantity";
import { parseStoredCart } from "@/lib/cart-storage";
import { resolveQuantityUnitPrice } from "@/lib/product-quantity-pricing";
import { refreshCartPricing } from "@/lib/cart/refresh-cart-pricing";
import { resolvePreparedVariantsUnitPrices, resolvePreparedVariantsTotalPrice } from "@/lib/product-prepared-variants";
import { removeCartLineWithLinkedUpsells } from "@/lib/cart/remove-cart-line";

const row: ProductRow = {
  id: "11111111-1111-4111-8111-111111111111",
  slug: "basket",
  product_code: "VM-TEST",
  name: "Кошничка",
  description: "",
  price: 10,
  image_url: null,
  is_customizable: false,
  show_quantity_selector: true,
  quantity_price_tiers: [
    { minQuantity: 1, maxQuantity: 5, unitPrice: 10 },
    { minQuantity: 6, maxQuantity: 10, unitPrice: 8 },
    { minQuantity: 11, maxQuantity: null, unitPrice: 7 },
  ],
};
const promotion: ProductPromotionRow = {
  id: "promo", product_id: row.id, name: "25%", discount_type: "percentage",
  discount_value: 25, starts_at: "2020-01-01T00:00:00Z",
  ends_at: "2100-01-01T00:00:00Z", is_active: true, created_at: "2020-01-01T00:00:00Z",
};

test("25% applies to each quantity tier, including quantity 1, 6 and 11", () => {
  const product = toProduct(row, [], promotion);
  assert.equal(product.price, 7.5);
  assert.equal(product.compareAtPrice, 10);
  assert.deepEqual(product.quantityPriceTiers?.map(tier => tier.compareAtUnitPrice), [10, 8, 7]);
  assert.equal(resolveQuantityUnitPrice(product.price, product.quantityPriceTiers, 1), 7.5);
  assert.equal(resolveQuantityUnitPrice(product.price, product.quantityPriceTiers, 6), 6);
  assert.equal(resolveQuantityUnitPrice(product.price, product.quantityPriceTiers, 11), 5.25);
  assert.equal((row.quantity_price_tiers as {unitPrice: number}[])[1].unitPrice, 8);
});

test("discounted tiers survive add, quantity changes, merging and cart persistence", () => {
  const product = toProduct(row, [], promotion);
  const prepared = prepareCartLineInput({product, quantity: 1});
  assert.ok(prepared);
  assert.equal(prepared.line.price, 7.5);
  let lines = updateCartLineQuantityWithLinkedUpsells([prepared.line], prepared.lineId, 6);
  assert.equal(lines[0].price, 6);
  assert.equal(lines[0].price * lines[0].quantity, 36);
  lines = parseStoredCart(JSON.stringify(lines));
  lines = updateCartLineQuantityWithLinkedUpsells(lines, prepared.lineId, 11);
  assert.equal(lines[0].price, 5.25);
  lines = updateCartLineQuantityWithLinkedUpsells(lines, prepared.lineId, 1);
  assert.equal(lines[0].price, 7.5);
  const another = prepareCartLineInput({product, quantity: 5});
  assert.ok(another);
  lines = mergeCartLineForAdd(lines, another);
  assert.equal(lines[0].quantity, 6);
  assert.equal(lines[0].price, 6);
});

test("inactive, expired and future campaigns leave original quantity prices unchanged", () => {
  for (const promo of [
    {...promotion, is_active: false},
    {...promotion, ends_at: "2021-01-01T00:00:00Z"},
    {...promotion, starts_at: "2099-01-01T00:00:00Z"},
  ]) {
    const product = toProduct(row, [], promo);
    assert.equal(product.price, 10);
    assert.ok(product.quantityPriceTiers?.every(tier => tier.compareAtUnitPrice === undefined));
    assert.equal(resolveQuantityUnitPrice(product.price, product.quantityPriceTiers, 6), 8);
  }
});

test("tier rounding happens once and fixed-price promotions never raise a cheaper tier", () => {
  const product = toProduct({...row, quantity_price_tiers: [
    {minQuantity: 1, maxQuantity: null, unitPrice: 3.35},
  ]}, [], promotion);
  assert.equal(product.quantityPriceTiers?.[0].unitPrice, 2.51);
  const fixed = toProduct(row, [], {...promotion, discount_type: "fixed_price", discount_value: 9});
  assert.deepEqual(fixed.quantityPriceTiers?.map(t => t.unitPrice), [9, 8, 7]);
  assert.deepEqual(fixed.quantityPriceTiers?.map(t => t.compareAtUnitPrice), [10, undefined, undefined]);
});

test("stored carts refresh campaign prices and restore regular tiers after expiry", () => {
  const regular = toProduct(row);
  const discounted = toProduct(row, [], promotion);
  const prepared = prepareCartLineInput({product: regular, quantity: 6});
  assert.ok(prepared);
  const original = {...prepared.line, optionDelta: 2, personalizationDelta: 1, price: 11};
  const snapshot = (product: typeof regular) => [{productId: product.id,
    baseUnitPrice: product.price, quantityPriceTiers: product.quantityPriceTiers ?? []}];
  const refreshed = refreshCartPricing([original], snapshot(discounted));
  assert.equal(refreshed[0].price, 9);
  assert.equal(refreshed[0].quantity, 6);
  assert.equal(refreshCartPricing(refreshed, snapshot(discounted)), refreshed);
  assert.equal(refreshCartPricing(refreshed, snapshot(regular))[0].price, 11);
  assert.equal(original.price, 11);
  const legacy = {...original, baseUnitPrice: undefined};
  assert.equal(refreshCartPricing([legacy], snapshot(discounted))[0], legacy);
});

test("refreshed carts combine quantity across colors and preserve upsell prices", () => {
  const product = toProduct(row);
  const prepared = prepareCartLineInput({product, quantity: 3});
  assert.ok(prepared);
  const first = {...prepared.line, lineId: "red"};
  const second = {...prepared.line, lineId: "blue"};
  const upsell = {...prepared.line, lineId: "upsell", price: 1,
    upsell: {offerId: "offer", sourceProductId: row.id, sourceProductTitle: "Basket",
      originalPrice: 10, specialPrice: 1}};
  const discounted = toProduct(row, [], promotion);
  const result = refreshCartPricing([first, second, upsell], [{productId: row.id,
    baseUnitPrice: discounted.price, quantityPriceTiers: discounted.quantityPriceTiers ?? []}]);
  assert.deepEqual(result.map(line => line.price), [6, 6, 1]);
});

const basket = () => toProduct({...row, price: 3.35, quantity_price_tiers: [
  {minQuantity: 1, maxQuantity: 5, unitPrice: 3.35},
  {minQuantity: 6, maxQuantity: 10, unitPrice: 3.2},
  {minQuantity: 11, maxQuantity: null, unitPrice: 3},
]}, [], promotion);

test("4 snowflakes plus 3 bells share the 7-item tier in summary, cart and reload", () => {
  const product = basket();
  const variants = [
    {quantity: 4, unitPrice: 2.51, optionSelections: [{groupId: "model", valueIds: ["snowflake"]}]},
    {quantity: 3, unitPrice: 2.51, optionSelections: [{groupId: "model", valueIds: ["bells"]}]},
  ];
  assert.deepEqual(resolvePreparedVariantsUnitPrices(product.price, product.quantityPriceTiers, variants), [2.4, 2.4]);
  assert.equal(resolvePreparedVariantsTotalPrice(product.price, product.quantityPriceTiers, variants), 16.8);
  const prepared = variants.map(variant => prepareCartLineInput({product, ...variant}));
  assert.ok(prepared[0]);
  assert.ok(prepared[1]);
  const first = mergeCartLineForAdd([], prepared[0]);
  const lines = mergeCartLineForAdd(first, prepared[1]);
  assert.deepEqual(lines.map(line => line.price), [2.4, 2.4]);
  const restored = parseStoredCart(JSON.stringify(lines));
  const decreased = updateCartLineQuantityWithLinkedUpsells(restored, prepared[1].lineId, 1);
  assert.deepEqual(decreased.map(line => line.price), [2.51, 2.51]);
  assert.equal(removeCartLineWithLinkedUpsells(lines, prepared[1].lineId)[0].price, 2.51);
  assert.equal(updateCartLineQuantityWithLinkedUpsells(lines, prepared[1].lineId, 0)[0].price, 2.51);
  // An existing four-item cart also contributes to a new three-item selection.
  assert.deepEqual(resolvePreparedVariantsUnitPrices(product.price, product.quantityPriceTiers, [variants[1]], 4), [2.4]);
});

test("all 19 baskets in the screenshot share the 11+ tier regardless of model", () => {
  const product = basket();
  const variants = [
    {quantity: 1, unitPrice: 2.51, optionSelections: [{groupId: "model", valueIds: ["snowflake"]}]},
    {quantity: 11, unitPrice: 2.25, optionSelections: [{groupId: "model", valueIds: ["bells"]}]},
    {quantity: 7, unitPrice: 2.4, optionSelections: [{groupId: "model", valueIds: ["bells"]}]},
  ];
  assert.deepEqual(resolvePreparedVariantsUnitPrices(product.price, product.quantityPriceTiers, variants), [2.25, 2.25, 2.25]);
  assert.equal(resolvePreparedVariantsTotalPrice(product.price, product.quantityPriceTiers, variants), 42.75);
});

test("different products and special upsells do not contribute to regular product tiers", () => {
  const product = basket();
  const main = prepareCartLineInput({product, quantity: 4});
  const other = prepareCartLineInput({product: {...product, id: "22222222-2222-4222-8222-222222222222"}, quantity: 3});
  assert.ok(main);
  assert.ok(other);
  const upsell = {...main.line, lineId: "upsell", quantity: 3, price: 1,
    upsell: {offerId: "special", sourceProductId: product.id, sourceProductTitle: "Basket",
      originalPrice: 3.35, specialPrice: 1}};
  const lines = mergeCartLineForAdd([other.line, upsell], main);
  assert.equal(lines.find(line => line.lineId === main.lineId)?.price, 2.51);
  assert.equal(lines.find(line => line.lineId === other.lineId)?.price, 2.51);
  assert.equal(lines.find(line => line.lineId === "upsell")?.price, 1);
});
