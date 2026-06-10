import assert from "node:assert/strict";
import test from "node:test";

import {
  filterEcontCities,
  formatEcontOfficeLabel,
  type EcontCity,
} from "@/lib/shipping/econt";

const sampleCities: EcontCity[] = [
  { id: 1, name: "София", postCode: "1000", regionName: "София" },
  { id: 2, name: "Пловдив", postCode: "4000", regionName: "Пловдив" },
  { id: 3, name: "Варна", postCode: "9000", regionName: "Варна" },
];

test("filterEcontCities requires at least two characters", () => {
  assert.deepEqual(filterEcontCities(sampleCities, "с"), []);
});

test("filterEcontCities matches city and region names", () => {
  const results = filterEcontCities(sampleCities, "плов");
  assert.equal(results.length, 1);
  assert.equal(results[0]?.name, "Пловдив");
});

test("formatEcontOfficeLabel includes address when available", () => {
  const label = formatEcontOfficeLabel({
    id: 10,
    code: "1000",
    name: "София Младост",
    isAPS: false,
    fullAddress: "София, бул. Александър Малинов 31",
  });

  assert.match(label, /София Младост/);
  assert.match(label, /Александър Малинов/);
});
