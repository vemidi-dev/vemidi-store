import assert from "node:assert/strict";
import test from "node:test";

import {
  buildOrdersCsv,
  filterOrders,
  getOrderCounts,
  getOrderSource,
  normalizeOrderSource,
  normalizeOrderStatus,
  type OrderRow,
} from "@/lib/admin/orders";

function makeOrder(overrides: Partial<OrderRow>): OrderRow {
  return {
    id: "order",
    created_at: "2026-06-09T10:00:00.000Z",
    status: "new",
    product_name: null,
    kit_name: null,
    kit_size: null,
    coloring: null,
    personalization: null,
    child_name: null,
    total_price: 25,
    currency: "EUR",
    customer_name: "Мария Иванова",
    customer_phone: "0888123456",
    customer_email: "maria@example.com",
    courier: "speedy",
    delivery_type: "office",
    city: "София",
    delivery_details: "",
    office_id: null,
    office_name: "Младост 2",
    office_address: null,
    payment_method: "cash_on_delivery",
    note: null,
    raw_payload: null,
    ...overrides,
  };
}

const orders = [
  makeOrder({
    id: "store",
    status: "confirmed",
    raw_payload: {
      source: "vemidi-store",
      order: {
        items: [{ name: "Плик за пари", quantity: 2 }],
      },
    },
  }),
  makeOrder({
    id: "landing",
    status: "completed",
    customer_name: "Иван Петров",
    customer_email: null,
    product_name: "Творчески комплект",
  }),
];

test("order filters normalize unsupported values", () => {
  assert.equal(normalizeOrderStatus("making"), "making");
  assert.equal(normalizeOrderStatus("unknown"), "");
  assert.equal(normalizeOrderSource("store"), "store");
  assert.equal(normalizeOrderSource("unknown"), "");
});

test("order source and combined filters are stable", () => {
  assert.equal(getOrderSource(orders[0]), "store");
  assert.equal(getOrderSource(orders[1]), "landing");
  assert.deepEqual(
    filterOrders(orders, {
      status: "confirmed",
      source: "store",
      search: "плик",
    }).map((order) => order.id),
    ["store"],
  );
});

test("order counters summarize workflow and source", () => {
  assert.deepEqual(getOrderCounts(orders), {
    total: 2,
    new: 0,
    active: 1,
    completed: 1,
    store: 1,
    landing: 1,
  });
});

test("order CSV includes filtered operational data and escapes formulas", () => {
  const csv = buildOrdersCsv([
    makeOrder({
      customer_name: "=unsafe",
      raw_payload: {
        source: "vemidi-store",
        order: { items: [{ name: "Плик за пари", quantity: 2 }] },
      },
    }),
  ]);

  assert.match(csv, /"created_at","source","status"/);
  assert.match(csv, /"'=unsafe"/);
  assert.match(csv, /"2 x Плик за пари"/);
});
