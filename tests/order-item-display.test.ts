import assert from "node:assert/strict";
import test from "node:test";

import {
  buildStoreOrderItemDetailLines,
  shouldShowOrderPersonalizationSummary,
} from "@/lib/admin/order-item-display";
import { parseStoreOrderItems, type OrderRow } from "@/lib/admin/orders";

const butterflyItem = {
  productId: "d594ddce-2fb5-49e0-859d-9ff91e752b9d",
  name: "Творчески комплект „Вълшебни пеперуди“",
  quantity: 1,
  unitPrice: 26.5,
  lineTotal: 26.5,
  baseUnitPrice: 13.5,
  effectiveBasePrice: 13.5,
  optionDelta: 10.5,
  personalization: "Мария",
  personalizationFields: [{
    fieldId: "name-field-id",
    fieldKey: "name",
    label: "Име",
    value: "Мария",
  }],
  selectedColors: [],
  optionSelections: [{
    groupId: "size-group",
    groupName: "Размер",
    groupKey: "size",
    inputType: "single" as const,
    textValue: null,
    groupPriceDelta: 0,
    values: [{
      valueId: "maxi",
      label: "Комплект Макси",
      key: "maxi",
      priceDelta: 10.5,
      sku: null,
    }],
  }, {
    groupId: "coloring-group",
    groupName: "Оцветяване",
    groupKey: "coloring",
    inputType: "single" as const,
    textValue: null,
    groupPriceDelta: 0,
    values: [{
      valueId: "markers",
      label: "Маркери",
      key: "markers",
      priceDelta: 0,
      sku: null,
    }],
  }],
};

test("admin order item shows personalization once and structured options with price deltas", () => {
  const lines = buildStoreOrderItemDetailLines(butterflyItem);

  assert.deepEqual(lines.map((line) => line.text), [
    "Име: Мария",
    "Размер: Комплект Макси (+10,50 €)",
    "Оцветяване: Маркери",
  ]);
  assert.doesNotMatch(lines.join("\n"), /Доплащане опции/);
  assert.equal(
    lines.filter((line) => /Мария/.test(line.text)).length,
    1,
  );
});

test("admin order item falls back to legacy personalization when structured fields are missing", () => {
  const lines = buildStoreOrderItemDetailLines({
    personalization: "Габи",
    personalizationFields: [],
    selectedColors: [],
    optionSelections: [],
  });

  assert.deepEqual(lines, [{ text: "Персонализация: Габи" }]);
});

test("admin order details hide duplicate global personalization summary for store items", () => {
  assert.equal(
    shouldShowOrderPersonalizationSummary(1, "Име: Мария | Размер: Комплект Макси"),
    false,
  );
  assert.equal(
    shouldShowOrderPersonalizationSummary(0, "Габи"),
    true,
  );
});

test("store order payload pricing stays 13.50 + 10.50 + 2.50 = 26.50", () => {
  const order: OrderRow = {
    id: "11111111-1111-1111-1111-111111111111",
    created_at: "2026-06-21T10:00:00.000Z",
    status: "new",
    product_name: null,
    kit_name: null,
    kit_size: null,
    coloring: null,
    personalization: null,
    child_name: null,
    total_price: 26.5,
    currency: "EUR",
    customer_name: "Мария",
    customer_phone: "0888123456",
    customer_email: null,
    courier: "speedy",
    delivery_type: "office",
    city: "София",
    delivery_details: "",
    office_id: null,
    office_name: "Офис",
    office_address: null,
    payment_method: "cash_on_delivery",
    note: null,
    raw_payload: {
      source: "vemidi-store",
      order: {
        items: [butterflyItem],
      },
    },
  };

  const [item] = parseStoreOrderItems(order);
  assert.equal(item?.unitPrice, 26.5);
  assert.equal(item?.lineTotal, 26.5);
  assert.equal(item?.baseUnitPrice, 13.5);
  assert.equal(item?.optionDelta, 10.5);
  assert.equal(
    (item?.baseUnitPrice ?? 0) + (item?.optionDelta ?? 0) + 2.5,
    item?.unitPrice,
  );
});
