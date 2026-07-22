import assert from "node:assert/strict";
import test from "node:test";

import {
  buildOrdersCsv,
  defaultOrderCsvColumns,
  describeOrderDeleteError,
  filterOrders,
  getOrderCounts,
  getOrderPersonalizationSummary,
  getLegacyProductOrderCode,
  getOrderItemProductCode,
  getOrderShortId,
  getOrderSourceFilterValue,
  getOrderSourceKind,
  getOrderSourceLabel,
  getLandingOrderColoringLabel,
  isLandingOnlyOrder,
  normalizeOrderCsvColumns,
  normalizeOrderPage,
  normalizeOrderPageSize,
  normalizeOrderSource,
  normalizeOrderStatus,
  paginateOrders,
  parseStoreOrderItems,
  sortOrders,
  type OrderRow,
} from "@/lib/admin/orders";

function makeOrder(overrides: Partial<OrderRow>): OrderRow {
  return {
    id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
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
    id: "11111111-1111-1111-1111-111111111111",
    status: "confirmed",
    created_at: "2026-06-10T10:00:00.000Z",
    raw_payload: {
      source: "vemidi-store",
      order: {
        items: [
          {
            productId: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
            name: "Плик за пари",
            quantity: 2,
            unitPrice: 12.5,
          },
        ],
      },
    },
  }),
  makeOrder({
    id: "22222222-2222-2222-2222-222222222222",
    status: "completed",
    created_at: "2026-06-08T10:00:00.000Z",
    customer_name: "Иван Петров",
    customer_email: null,
    product_name: "Творчески комплект",
    kit_name: "Комплект А",
  }),
  makeOrder({
    id: "33333333-3333-3333-3333-333333333333",
    status: "new",
    created_at: "2026-06-01T10:00:00.000Z",
    total_price: 5,
    customer_name: "Без източник",
    raw_payload: null,
  }),
];

test("order filters normalize unsupported values", () => {
  assert.equal(normalizeOrderStatus("making"), "making");
  assert.equal(normalizeOrderStatus("unknown"), "");
  assert.equal(normalizeOrderSource("store"), "store");
  assert.equal(normalizeOrderSource("unknown"), "");
  assert.equal(normalizeOrderPage("0"), 1);
  assert.equal(normalizeOrderPageSize("500"), 100);
});

test("order source labels avoid guessing when source is missing", () => {
  assert.equal(getOrderSourceKind(orders[0]), "store");
  assert.equal(getOrderSourceLabel(orders[0]), "Онлайн магазин");
  assert.equal(getOrderSourceLabel(orders[2]), "Неуточнен");
  assert.equal(getOrderSourceFilterValue(orders[1]), "landing");
  assert.equal(getOrderSourceFilterValue(orders[2]), "unknown");
});

test("order filters combine status, source, period and search", () => {
  assert.deepEqual(
    filterOrders(orders, {
      status: "confirmed",
      source: "store",
      search: "плик",
      dateFrom: "2026-06-09",
      dateTo: "2026-06-11",
    }).map((order) => order.id),
    ["11111111-1111-1111-1111-111111111111"],
  );

  assert.deepEqual(
    filterOrders(orders, {
      status: "",
      source: "unknown",
      search: "",
    }).map((order) => order.id),
    ["33333333-3333-3333-3333-333333333333"],
  );
});

test("order pagination and sorting helpers", () => {
  const sorted = sortOrders(orders, "total-desc");
  assert.equal(sorted[0]?.id, "11111111-1111-1111-1111-111111111111");

  const page = paginateOrders(sorted, 2, 2);
  assert.equal(page.length, 1);
  assert.equal(page[0]?.id, "33333333-3333-3333-3333-333333333333");
});

test("order counters summarize workflow and source", () => {
  assert.deepEqual(getOrderCounts(orders), {
    total: 3,
    new: 1,
    active: 1,
    completed: 1,
    store: 1,
    landing: 1,
    unknown: 1,
  });
});

test("store order items use saved unit price from payload", () => {
  const items = parseStoreOrderItems(orders[0]);
  assert.equal(
    items[0]?.productId,
    "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
  );
  assert.equal(items[0]?.unitPrice, 12.5);
  assert.equal(items[0]?.quantity, 2);
});

test("legacy product order code keeps the complete unique product id", () => {
  assert.equal(
    getLegacyProductOrderCode("aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee"),
    "PRD-AAAAAAAABBBB4CCC8DDDEEEEEEEEEEEE",
  );
});

test("order item product code prefers VM snapshot code", () => {
  assert.equal(
    getOrderItemProductCode({
      productId: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
      productCode: "VM-000321",
    }),
    "VM-000321",
  );
});

test("order CSV uses Bulgarian headers, BOM-ready escaping and selected columns", () => {
  const csv = buildOrdersCsv(
    [
      makeOrder({
        customer_name: "=unsafe",
        raw_payload: {
          source: "vemidi-store",
          order: {
            items: [
              {
                name: "Плик за пари",
                quantity: 2,
                unitPrice: 12.5,
                personalization: "Честит\nрожден ден",
              },
            ],
          },
        },
      }),
    ],
    ["order_number", "customer_name", "personalization"],
  );

  assert.match(csv, /^"Номер","Име","Персонализация"/);
  assert.match(csv, /"'=unsafe"/);
  assert.match(csv, /Честит/);
  assert.deepEqual(normalizeOrderCsvColumns(["bad", "status"]), ["status"]);
  assert.deepEqual(normalizeOrderCsvColumns([]), defaultOrderCsvColumns);
});

test("order short id and personalization summary stay readable", () => {
  assert.equal(getOrderShortId(orders[0]), "11111111");
  assert.match(
    getOrderPersonalizationSummary(
      makeOrder({
        personalization: true,
        child_name: "Габи",
      }),
    ),
    /Габи/,
  );
});

test("landing-only orders expose kit fields for admin detail panels", () => {
  const landingOrder = makeOrder({
    kit_name: "Комплект Стандарт",
    kit_size: "5",
    coloring: "paints",
    personalization: true,
    child_name: "Мария",
    raw_payload: { source: "campaign-butterflies" },
  });

  assert.equal(isLandingOnlyOrder(landingOrder), true);
  assert.equal(getLandingOrderColoringLabel("paints"), "Бои");
  assert.equal(getOrderSourceLabel(landingOrder), "Кампания (butterflies)");
});

test("describeOrderDeleteError localizes FK and permission failures", () => {
  assert.equal(
    describeOrderDeleteError({
      code: "23503",
      message: 'update or delete on table "orders" violates foreign key constraint',
    }),
    "Поръчката не може да бъде изтрита, защото има свързани записи в системата.",
  );
  assert.equal(
    describeOrderDeleteError({ code: "42501", message: "permission denied for table orders" }),
    "Нямате права да изтриете тази поръчка.",
  );
  assert.equal(describeOrderDeleteError(null), "Поръчката не беше изтрита.");
});
