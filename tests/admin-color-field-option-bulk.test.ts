import assert from "node:assert/strict";
import test from "node:test";

import {
  areAllColorFieldOptionsSelected,
  getColorFieldOptionIds,
} from "@/lib/admin/color-field-option-bulk";

const paletteOptions = [
  { id: "red", name: "Червено" },
  { id: "white", name: "Бяло" },
  { id: "pink", name: "Розово" },
];

test("getColorFieldOptionIds returns all palette option ids", () => {
  assert.deepEqual(getColorFieldOptionIds(paletteOptions), ["red", "white", "pink"]);
});

test("areAllColorFieldOptionsSelected checks full palette selection", () => {
  assert.equal(
    areAllColorFieldOptionsSelected(paletteOptions, ["red", "white", "pink"]),
    true,
  );
  assert.equal(areAllColorFieldOptionsSelected(paletteOptions, ["red", "white"]), false);
  assert.equal(areAllColorFieldOptionsSelected([], ["red"]), false);
});
