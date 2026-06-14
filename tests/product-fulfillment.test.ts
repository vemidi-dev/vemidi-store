import assert from "node:assert/strict";
import test from "node:test";

import { parseProductFulfillmentFromFormData } from "@/lib/admin/form-data";
import { adminFormFields } from "@/lib/admin/form-fields";
import {
  aggregateCartDemand,
  applyAvailabilityToProduct,
  formatAdminFulfillmentListStatus,
  getProductAvailabilityLabel,
  isProductOrderable,
  resolveProductAvailability,
  validateFulfillmentInput,
} from "@/lib/product-fulfillment";

test("made_to_order products stay orderable and never require stock", () => {
  const availability = resolveProductAvailability({
    fulfillmentType: "made_to_order",
    stockQuantity: null,
    soldOut: false,
  });

  assert.equal(availability.orderable, true);
  assert.equal(availability.availabilityLabel, "Изработва се по поръчка");
  assert.equal(validateFulfillmentInput("made_to_order", null), null);
});

test("made_to_order ignores stock quantity for orderability", () => {
  assert.equal(
    isProductOrderable({
      fulfillmentType: "made_to_order",
      stockQuantity: 0,
      soldOut: false,
    }),
    true,
  );
});

test("stocked products require non-negative integer stock in admin validation", () => {
  assert.equal(validateFulfillmentInput("stocked", null), "Въведете цяло число за складовата наличност.");
  assert.equal(validateFulfillmentInput("stocked", -1), "Складовата наличност трябва да е цяло число >= 0.");
  assert.equal(validateFulfillmentInput("stocked", 3), null);
});

test("stocked with zero stock and unavailable are blocked", () => {
  assert.equal(
    getProductAvailabilityLabel({
      fulfillmentType: "stocked",
      stockQuantity: 0,
      soldOut: false,
    }),
    "Изчерпан",
  );
  assert.equal(
    isProductOrderable({
      fulfillmentType: "stocked",
      stockQuantity: 0,
      soldOut: false,
    }),
    false,
  );
  assert.equal(
    isProductOrderable({
      fulfillmentType: "unavailable",
      stockQuantity: null,
      soldOut: false,
    }),
    false,
  );
});

test("is_sold_out still blocks orderability alongside fulfillment modes", () => {
  assert.equal(
    isProductOrderable({
      fulfillmentType: "stocked",
      stockQuantity: 10,
      soldOut: true,
    }),
    false,
  );
  assert.equal(
    getProductAvailabilityLabel({
      fulfillmentType: "made_to_order",
      stockQuantity: null,
      soldOut: true,
    }),
    "Изчерпан",
  );
});

test("aggregateCartDemand groups duplicate product lines", () => {
  const demand = aggregateCartDemand([
    { productId: "a", quantity: 2 },
    { productId: "b", quantity: 1 },
    { productId: "a", quantity: 3 },
  ]);

  assert.deepEqual([...demand.entries()], [
    ["a", 5],
    ["b", 1],
  ]);
});

test("applyAvailabilityToProduct enriches catalog products", () => {
  const product = applyAvailabilityToProduct({
    id: "1",
    slug: "test",
    productCode: "VM-000001",
    title: "Test",
    description: "Desc",
    price: 10,
    images: [],
    customizable: false,
    soldOut: false,
    fulfillmentType: "stocked",
    stockQuantity: 4,
  });

  assert.equal(product.orderable, true);
  assert.equal(product.availabilityLabel, "В наличност");
});

test("admin form parses fulfillment fields from form data", () => {
  const formData = new FormData();
  formData.set(adminFormFields.product.fulfillmentType, "stocked");
  formData.set(adminFormFields.product.stockQuantity, "12");

  const parsed = parseProductFulfillmentFromFormData(formData);
  assert.equal(parsed.fulfillmentType, "stocked");
  assert.equal(parsed.stockQuantity, 12);
  assert.equal(parsed.error, null);
});

test("admin form rejects stock quantity for made_to_order", () => {
  const formData = new FormData();
  formData.set(adminFormFields.product.fulfillmentType, "made_to_order");
  formData.set(adminFormFields.product.stockQuantity, "5");

  const parsed = parseProductFulfillmentFromFormData(formData);
  assert.equal(parsed.stockQuantity, null);
  assert.equal(parsed.error, null);
});

test("admin list status prefers manual sold-out over fulfillment mode", () => {
  assert.equal(
    formatAdminFulfillmentListStatus({
      soldOut: true,
      fulfillmentType: "stocked",
      stockQuantity: 12,
    }),
    "Изчерпан · ръчен стоп",
  );
});

test("admin list status shows stocked quantity for admins only", () => {
  assert.equal(
    formatAdminFulfillmentListStatus({
      soldOut: false,
      fulfillmentType: "stocked",
      stockQuantity: 7,
    }),
    "Склад · 7 бр.",
  );
  assert.equal(
    formatAdminFulfillmentListStatus({
      soldOut: false,
      fulfillmentType: "made_to_order",
      stockQuantity: null,
    }),
    "По поръчка",
  );
});
