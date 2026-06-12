import assert from "node:assert/strict";
import test from "node:test";

import { makeCartLineId } from "@/lib/cart-line-id";
import { parseStoredCart } from "@/lib/cart-storage";
import { CART_STORAGE_KEY } from "@/lib/cart-types";
import {
  evaluateCampaignHandoff,
  parseCampaignHandoffQuery,
} from "@/lib/campaign-handoff";
import type { Product } from "@/lib/catalog";
import { formatOrderOptionLine, parseOrderOptionSelections } from "@/lib/order-option-display";
import {
  buildDefaultOptionSelections,
  getVisibleOptionGroups,
  type ProductOptionGroup,
} from "@/lib/product-options";
import {
  calculateEstimatedUnitPrice,
  calculateOptionFinalPrice,
  calculateOptionDelta,
  calculatePriceDeltaFromFinalPrice,
} from "@/lib/product-option-pricing";
import { validateProductOptionSelections } from "@/lib/product-option-validation";
import { resolveProductPricing } from "@/lib/product-pricing";

const productId = "11111111-1111-4111-8111-111111111111";
const groupSizeId = "22222222-2222-4222-8222-222222222222";
const groupFrameId = "33333333-3333-4333-8333-333333333333";
const valueSmallId = "44444444-4444-4444-8444-444444444444";
const valueLargeId = "55555555-5555-4555-8555-555555555555";
const valueGoldId = "66666666-6666-4666-8666-666666666666";
const valueWoodId = "77777777-7777-4777-8777-777777777777";

function makeGroup(overrides: Partial<ProductOptionGroup> = {}): ProductOptionGroup {
  return {
    id: groupSizeId,
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
        id: valueSmallId,
        label: "Малък",
        key: "small",
        priceDelta: 0,
        isDefault: true,
        isActive: true,
        isSoldOut: false,
        sortOrder: 0,
      },
      {
        id: valueLargeId,
        label: "Голям",
        key: "large",
        priceDelta: 5,
        isDefault: false,
        isActive: true,
        isSoldOut: false,
        sortOrder: 1,
      },
    ],
    ...overrides,
  };
}

const baseProduct: Product = {
  slug: productId,
  title: "Примерен продукт",
  description: "Описание",
  price: 20,
  images: [],
  optionGroups: [makeGroup()],
};

test("single required option validates selection", () => {
  const result = validateProductOptionSelections(productId, baseProduct.optionGroups!, [
    { groupId: groupSizeId, valueIds: [valueSmallId] },
  ]);
  assert.equal(result.ok, true);
});

test("multiple min/max validation", () => {
  const group = makeGroup({
    id: "multi-group",
    inputType: "multiple",
    minSelect: 2,
    maxSelect: 2,
    isRequired: true,
    values: [
      {
        id: "a",
        label: "A",
        key: "a",
        priceDelta: 1,
        isDefault: false,
        isActive: true,
        isSoldOut: false,
        sortOrder: 0,
      },
      {
        id: "b",
        label: "B",
        key: "b",
        priceDelta: 2,
        isDefault: false,
        isActive: true,
        isSoldOut: false,
        sortOrder: 1,
      },
      {
        id: "c",
        label: "C",
        key: "c",
        priceDelta: 3,
        isDefault: false,
        isActive: true,
        isSoldOut: false,
        sortOrder: 2,
      },
    ],
  });

  assert.equal(
    validateProductOptionSelections(productId, [group], [
      { groupId: "multi-group", valueIds: ["a"] },
    ]).ok,
    false,
  );
  assert.equal(
    validateProductOptionSelections(productId, [group], [
      { groupId: "multi-group", valueIds: ["a", "b"] },
    ]).ok,
    true,
  );
});

test("default option is suggested for storefront", () => {
  const defaults = buildDefaultOptionSelections(baseProduct.optionGroups!);
  assert.deepEqual(defaults, [{ groupId: groupSizeId, valueIds: [valueSmallId] }]);
});

test("inactive option value is rejected", () => {
  const group = makeGroup({
    values: [
      {
        id: valueSmallId,
        label: "Малък",
        key: "small",
        priceDelta: 0,
        isDefault: false,
        isActive: false,
        isSoldOut: false,
        sortOrder: 0,
      },
    ],
  });
  const result = validateProductOptionSelections(productId, [group], [
    { groupId: groupSizeId, valueIds: [valueSmallId] },
  ]);
  assert.equal(result.ok, false);
});

test("sold-out option value is rejected", () => {
  const group = makeGroup({
    values: [
      {
        id: valueLargeId,
        label: "Голям",
        key: "large",
        priceDelta: 5,
        isDefault: false,
        isActive: true,
        isSoldOut: true,
        sortOrder: 0,
      },
    ],
  });
  const result = validateProductOptionSelections(productId, [group], [
    { groupId: groupSizeId, valueIds: [valueLargeId] },
  ]);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "option_value_sold_out");
  }
});

test("text max length validation", () => {
  const group = makeGroup({
    id: "text-group",
    inputType: "text",
    isRequired: true,
    minSelect: 0,
    maxSelect: 0,
    maxLength: 5,
    textPriceDelta: 2,
    values: [],
  });
  const result = validateProductOptionSelections(productId, [group], [
    { groupId: "text-group", valueIds: [], textValue: "123456" },
  ]);
  assert.equal(result.ok, false);
});

test("conditional group requires dependency", () => {
  const frameGroup = makeGroup({
    id: groupFrameId,
    name: "Рамка",
    key: "frame",
    dependsOnOptionId: valueLargeId,
    isRequired: true,
    values: [
      {
        id: valueGoldId,
        label: "Златна",
        key: "gold",
        priceDelta: 3,
        isDefault: false,
        isActive: true,
        isSoldOut: false,
        sortOrder: 0,
      },
    ],
  });
  const groups = [makeGroup(), frameGroup];

  assert.equal(
    getVisibleOptionGroups(groups, [{ groupId: groupSizeId, valueIds: [valueSmallId] }])
      .some((group) => group.id === groupFrameId),
    false,
  );

  const missing = validateProductOptionSelections(productId, groups, [
    { groupId: groupSizeId, valueIds: [valueLargeId] },
  ]);
  assert.equal(missing.ok, false);

  const ok = validateProductOptionSelections(productId, groups, [
    { groupId: groupSizeId, valueIds: [valueLargeId] },
    { groupId: groupFrameId, valueIds: [valueGoldId] },
  ]);
  assert.equal(ok.ok, true);
});

test("invalid group from another product context", () => {
  const result = validateProductOptionSelections(productId, [makeGroup()], [
    { groupId: "99999999-9999-4999-8999-999999999999", valueIds: [valueSmallId] },
  ]);
  assert.equal(result.ok, false);
});

test("invalid value from another group", () => {
  const result = validateProductOptionSelections(productId, [makeGroup()], [
    { groupId: groupSizeId, valueIds: [valueWoodId] },
  ]);
  assert.equal(result.ok, false);
});

test("duplicate selections are rejected", () => {
  const result = validateProductOptionSelections(productId, [makeGroup()], [
    { groupId: groupSizeId, valueIds: [valueSmallId] },
    { groupId: groupSizeId, valueIds: [valueLargeId] },
  ]);
  assert.equal(result.ok, false);
});

test("duplicate values in one selection are rejected", () => {
  const group = makeGroup({
    inputType: "multiple",
    minSelect: 2,
    maxSelect: 2,
    values: [
      {
        id: valueSmallId,
        label: "Малък",
        key: "small",
        priceDelta: 0,
        isDefault: false,
        isActive: true,
        isSoldOut: false,
        sortOrder: 0,
      },
    ],
  });
  const result = validateProductOptionSelections(productId, [group], [
    { groupId: groupSizeId, valueIds: [valueSmallId, valueSmallId] },
  ]);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "duplicate_option_value");
  }
});

test("invalid calendar date is rejected", () => {
  const group = makeGroup({
    id: "date-group",
    inputType: "date",
    isRequired: true,
    minSelect: 0,
    maxSelect: 0,
    values: [],
  });
  const result = validateProductOptionSelections(productId, [group], [
    { groupId: "date-group", valueIds: [], textValue: "2026-02-31" },
  ]);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "invalid_option_date");
  }
});

test("client forged price is ignored in pricing helper", () => {
  const delta = calculateOptionDelta(baseProduct.optionGroups!, [
    { groupId: groupSizeId, valueIds: [valueLargeId] },
  ]);
  assert.equal(delta, 5);
  const unit = calculateEstimatedUnitPrice(20, baseProduct.optionGroups!, [
    { groupId: groupSizeId, valueIds: [valueLargeId] },
  ]);
  assert.equal(unit, 25);
});

test("admin final variant prices convert to stable deltas", () => {
  assert.equal(calculatePriceDeltaFromFinalPrice(13.5, 13.5), 0);
  assert.equal(calculatePriceDeltaFromFinalPrice(13.5, 18), 4.5);
  assert.equal(calculatePriceDeltaFromFinalPrice(13.5, 24), 10.5);
  assert.equal(calculateOptionFinalPrice(13.5, 4.5), 18);
});

test("base promotion applies only to base price", () => {
  const pricing = resolveProductPricing(30, {
    id: "promo",
    name: "Promo",
    discount_type: "percentage",
    discount_value: 10,
    starts_at: new Date(Date.now() - 60_000).toISOString(),
    ends_at: new Date(Date.now() + 60_000).toISOString(),
    is_active: true,
    product_id: productId,
    created_at: new Date().toISOString(),
  });
  const effectiveBase = pricing.price;
  const unit = calculateEstimatedUnitPrice(effectiveBase, baseProduct.optionGroups!, [
    { groupId: groupSizeId, valueIds: [valueLargeId] },
  ]);
  assert.equal(effectiveBase, 27);
  assert.equal(unit, 32);
});

test("final price cannot be negative", () => {
  const unit = calculateEstimatedUnitPrice(0, baseProduct.optionGroups!, [
    { groupId: groupSizeId, valueIds: [valueLargeId] },
  ]);
  assert.equal(unit, 5);
});

test("stable cart line id with universal options", () => {
  const first = makeCartLineId(productId, undefined, undefined, undefined, [
    { groupId: groupSizeId, valueIds: [valueLargeId] },
    { groupId: groupFrameId, valueIds: [], textValue: "Име" },
  ]);
  const second = makeCartLineId(productId, undefined, undefined, undefined, [
    { groupId: groupFrameId, valueIds: [], textValue: "Име" },
    { groupId: groupSizeId, valueIds: [valueLargeId] },
  ]);
  assert.equal(first, second);
});

test("different options create separate cart line ids", () => {
  const a = makeCartLineId(productId, undefined, undefined, undefined, [
    { groupId: groupSizeId, valueIds: [valueSmallId] },
  ]);
  const b = makeCartLineId(productId, undefined, undefined, undefined, [
    { groupId: groupSizeId, valueIds: [valueLargeId] },
  ]);
  assert.notEqual(a, b);
});

test("order snapshot parser uses saved labels", () => {
  const snapshot = parseOrderOptionSelections([
    {
      groupId: groupSizeId,
      groupName: "Размер",
      groupKey: "size",
      inputType: "single",
      values: [{ valueId: valueLargeId, label: "Голям", key: "large", priceDelta: 5 }],
      groupPriceDelta: 5,
    },
  ]);
  assert.equal(formatOrderOptionLine(snapshot[0]), "Размер: Голям (+5,00 €)");
});

test("campaign handoff with valid selections", () => {
  const product: Product = {
    ...baseProduct,
    optionGroups: [makeGroup()],
  };
  const query = parseCampaignHandoffQuery({
    product: productId,
    campaign: "sample",
    [`opt_${groupSizeId}`]: valueLargeId,
  });
  const result = evaluateCampaignHandoff(product, query);
  assert.equal(result.status, "ready");
});

test("campaign handoff missing required selection redirects path", () => {
  const product: Product = {
    ...baseProduct,
    optionGroups: [makeGroup({ isRequired: true })],
  };
  const query = parseCampaignHandoffQuery({
    product: productId,
    campaign: "sample",
  });
  const result = evaluateCampaignHandoff(product, query);
  assert.equal(result.status, "needs_configuration");
});

test("legacy product without universal options", () => {
  const result = validateProductOptionSelections(productId, [], []);
  assert.equal(result.ok, true);
  assert.equal(result.ok && result.optionDelta, 0);
});

test("product with both legacy and universal options", () => {
  const product: Product = {
    ...baseProduct,
    colorFields: [
      {
        id: "color-field",
        label: "Цвят",
        key: "color",
        groupId: "g",
        groupLabel: "Цвят",
        minSelect: 1,
        maxSelect: 1,
        options: [{ id: "red", name: "Червен", hex: "#f00" }],
      },
    ],
    personalizationFields: [
      {
        id: "pf1",
        label: "Име",
        key: "name",
        type: "text",
        placeholder: null,
        maxLength: 50,
        required: false,
        allowsWishTemplates: false,
      },
    ],
  };
  const options = validateProductOptionSelections(productId, product.optionGroups!, [
    { groupId: groupSizeId, valueIds: [valueSmallId] },
  ]);
  assert.equal(options.ok, true);
  assert.ok(product.colorFields?.length);
  assert.ok(product.personalizationFields?.length);
});

test("cart storage migrates v8 key shape without options", () => {
  const legacy = JSON.stringify([
    {
      lineId: makeCartLineId(productId),
      slug: productId,
      title: "Legacy line",
      price: 12,
      quantity: 1,
    },
  ]);
  const lines = parseStoredCart(legacy);
  assert.equal(lines.length, 1);
  assert.equal(lines[0]?.slug, productId);
  assert.equal(CART_STORAGE_KEY.includes("v9"), true);
});
