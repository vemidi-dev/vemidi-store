import assert from "node:assert/strict";
import test from "node:test";

import {
  getPreparedVariantPricingGroupKey,
  resolvePreparedVariantUnitPrice,
  resolvePreparedVariantsUnitPrices,
  resolvePreparedVariantsTotalPrice,
} from "@/lib/product-prepared-variants";

const tiers = [
  { minQuantity: 1, maxQuantity: 5, unitPrice: 3.35 },
  { minQuantity: 6, maxQuantity: 10, unitPrice: 3.2 },
  { minQuantity: 11, maxQuantity: null, unitPrice: 3 },
];

const albasiaOptionSelections = [
  { groupId: "size-group", valueIds: ["medium"] },
  { groupId: "material-group", valueIds: ["albasia"] },
];

const birchOptionSelections = [
  { groupId: "size-group", valueIds: ["medium"] },
  { groupId: "material-group", valueIds: ["birch"] },
];

test("selected variants summary shares quantity tier for same material across colors", () => {
  const lineA = { quantity: 2, unitPrice: 3.35, optionSelections: albasiaOptionSelections };
  const lineB = { quantity: 5, unitPrice: 3.35, optionSelections: albasiaOptionSelections };
  const unitPrices = resolvePreparedVariantsUnitPrices(3.35, tiers, [lineA, lineB]);

  assert.deepEqual(unitPrices, [3.2, 3.2]);
  assert.equal(Math.round(lineA.quantity * unitPrices[0]! * 100) / 100, 6.4);
  assert.equal(Math.round(lineB.quantity * unitPrices[1]! * 100) / 100, 16);

  const total = resolvePreparedVariantsTotalPrice(3.35, tiers, [lineA, lineB]);
  assert.equal(Math.round(total * 100) / 100, 22.4);
});

test("selected variants summary keeps separate tiers for different materials", () => {
  const lineA = { quantity: 5, unitPrice: 3.35, optionSelections: albasiaOptionSelections };
  const lineB = { quantity: 2, unitPrice: 3.7, optionSelections: birchOptionSelections };
  const unitPrices = resolvePreparedVariantsUnitPrices(3.35, tiers, [lineA, lineB]);

  assert.deepEqual(unitPrices, [3.35, 3.7]);
  assert.equal(Math.round(lineA.quantity * unitPrices[0]! * 100) / 100, 16.75);
  assert.equal(Math.round(lineB.quantity * unitPrices[1]! * 100) / 100, 7.4);
  assert.equal(resolvePreparedVariantsTotalPrice(3.35, tiers, [lineA, lineB]), 24.15);
});

test("prepared variants pricing group key ignores color and separates different options", () => {
  const albasiaLilac = {
    quantity: 2,
    unitPrice: 3.35,
    optionSelections: albasiaOptionSelections,
  };
  const albasiaRed = {
    quantity: 5,
    unitPrice: 3.35,
    optionSelections: albasiaOptionSelections,
  };
  const birchLilac = {
    quantity: 2,
    unitPrice: 3.7,
    optionSelections: birchOptionSelections,
  };

  const albasiaLilacKey = getPreparedVariantPricingGroupKey(albasiaLilac);
  const albasiaRedKey = getPreparedVariantPricingGroupKey(albasiaRed);
  const birchLilacKey = getPreparedVariantPricingGroupKey(birchLilac);

  assert.equal(albasiaLilacKey, albasiaRedKey);
  assert.notEqual(albasiaLilacKey, birchLilacKey);
  assert.ok(albasiaLilacKey.includes("material-group:albasia"));
  assert.ok(!albasiaLilacKey.includes("lilac"));
});

test("single prepared variant keeps its own tier when no grouping applies", () => {
  const line = {
    quantity: 5,
    unitPrice: 3.35,
    optionSelections: albasiaOptionSelections,
  };

  assert.equal(resolvePreparedVariantUnitPrice(3.35, tiers, line), 3.35);
});
