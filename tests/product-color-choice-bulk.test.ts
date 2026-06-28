import assert from "node:assert/strict";
import test from "node:test";

import {
  areAllChoiceColorsSelected,
  getChoiceColorBulkTargetIds,
  supportsChoiceColorBulkSelect,
  type ProductColorField,
} from "@/lib/product-colors";

const multipleChoiceField: ProductColorField = {
  id: "ribbon-field",
  label: "Панделки",
  key: "ribbon",
  groupId: "ribbon-group",
  groupLabel: "Панделки",
  minSelect: 0,
  maxSelect: 3,
  selectionMode: "choice",
  options: [
    { id: "red", name: "Червено", hex: "#c00" },
    { id: "white", name: "Бяло", hex: "#fff" },
    { id: "pink", name: "Розово", hex: "#f9c" },
    { id: "gold", name: "Златно", hex: "#fc0" },
  ],
};

const singleChoiceField: ProductColorField = {
  ...multipleChoiceField,
  maxSelect: 1,
};

const quantityField: ProductColorField = {
  ...multipleChoiceField,
  selectionMode: "quantity",
  requiredTotalQuantity: 12,
};

test("supportsChoiceColorBulkSelect enables bulk only for multi-choice fields", () => {
  assert.equal(supportsChoiceColorBulkSelect(multipleChoiceField), true);
  assert.equal(supportsChoiceColorBulkSelect(singleChoiceField), false);
  assert.equal(supportsChoiceColorBulkSelect(quantityField), false);
});

test("getChoiceColorBulkTargetIds respects maxSelect cap", () => {
  assert.deepEqual(getChoiceColorBulkTargetIds(multipleChoiceField), [
    "red",
    "white",
    "pink",
  ]);
  assert.deepEqual(getChoiceColorBulkTargetIds(singleChoiceField), []);
});

test("areAllChoiceColorsSelected checks capped bulk target set", () => {
  assert.equal(areAllChoiceColorsSelected(multipleChoiceField, ["red", "white", "pink"]), true);
  assert.equal(areAllChoiceColorsSelected(multipleChoiceField, ["red", "white"]), false);
  assert.equal(
    areAllChoiceColorsSelected(multipleChoiceField, ["red", "white", "pink", "gold"]),
    true,
  );
});
