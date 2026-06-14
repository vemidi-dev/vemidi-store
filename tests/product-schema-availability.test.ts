import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveSchemaOrgProductAvailability,
  SCHEMA_ORG_AVAILABILITY,
} from "@/lib/seo/product-schema-availability";

test("stocked product with stock maps to InStock", () => {
  assert.equal(
    resolveSchemaOrgProductAvailability({
      fulfillmentType: "stocked",
      stockQuantity: 4,
      soldOut: false,
    }),
    SCHEMA_ORG_AVAILABILITY.InStock,
  );
});

test("stocked product with zero stock maps to OutOfStock", () => {
  assert.equal(
    resolveSchemaOrgProductAvailability({
      fulfillmentType: "stocked",
      stockQuantity: 0,
      soldOut: false,
    }),
    SCHEMA_ORG_AVAILABILITY.OutOfStock,
  );
});

test("manual sold out flag maps to OutOfStock", () => {
  assert.equal(
    resolveSchemaOrgProductAvailability({
      fulfillmentType: "stocked",
      stockQuantity: 5,
      soldOut: true,
    }),
    SCHEMA_ORG_AVAILABILITY.OutOfStock,
  );
});

test("made_to_order orderable product maps to PreOrder", () => {
  assert.equal(
    resolveSchemaOrgProductAvailability({
      fulfillmentType: "made_to_order",
      stockQuantity: null,
      soldOut: false,
    }),
    SCHEMA_ORG_AVAILABILITY.PreOrder,
  );
});

test("unavailable fulfillment maps to OutOfStock", () => {
  assert.equal(
    resolveSchemaOrgProductAvailability({
      fulfillmentType: "unavailable",
      stockQuantity: null,
      soldOut: false,
    }),
    SCHEMA_ORG_AVAILABILITY.OutOfStock,
  );
});

test("sold out made_to_order maps to OutOfStock", () => {
  assert.equal(
    resolveSchemaOrgProductAvailability({
      fulfillmentType: "made_to_order",
      stockQuantity: null,
      soldOut: true,
    }),
    SCHEMA_ORG_AVAILABILITY.OutOfStock,
  );
});
