import assert from "node:assert/strict";
import test from "node:test";

import {
  isOrderNotificationOutboxUnavailable,
} from "@/lib/orders/order-notification-schedule";

import {
  buildOrderNotificationSummaries,
  getOrderNotificationOverallLabel,
  getOrderNotificationOverallStatus,
} from "@/lib/admin/order-notifications";
import {
  computeNextRetryAt,
  isDeliveryReadyForDispatch,
  ORDER_NOTIFICATION_MAX_ATTEMPTS,
} from "@/lib/orders/order-notification-schedule";
import type { OrderNotificationDeliveryRow } from "@/lib/orders/order-notification-schedule";

test("computeNextRetryAt returns null after max attempts", () => {
  assert.equal(
    computeNextRetryAt(ORDER_NOTIFICATION_MAX_ATTEMPTS, Date.parse("2026-06-14T10:00:00Z")),
    null,
  );
});

test("isDeliveryReadyForDispatch blocks future retries", () => {
  const row: Pick<OrderNotificationDeliveryRow, "status" | "attempt_count" | "next_retry_at"> = {
    status: "pending",
    attempt_count: 1,
    next_retry_at: new Date(Date.now() + 60_000).toISOString(),
  };

  assert.equal(isDeliveryReadyForDispatch(row), false);
});

test("isDeliveryReadyForDispatch allows retry after processing lease expires", () => {
  const row: Pick<OrderNotificationDeliveryRow, "status" | "attempt_count" | "next_retry_at"> = {
    status: "pending",
    attempt_count: 1,
    next_retry_at: new Date(Date.now() - 1_000).toISOString(),
  };

  assert.equal(isDeliveryReadyForDispatch(row), true);
});

test("buildOrderNotificationSummaries groups channels per order", () => {
  const summaries = buildOrderNotificationSummaries([
    {
      id: "1",
      order_id: "order-1",
      channel: "admin",
      status: "sent",
      attempt_count: 1,
      last_error: null,
      next_retry_at: null,
      sent_at: "2026-06-14T10:00:00Z",
      created_at: "2026-06-14T10:00:00Z",
      updated_at: "2026-06-14T10:00:00Z",
    },
    {
      id: "2",
      order_id: "order-1",
      channel: "customer",
      status: "pending",
      attempt_count: 1,
      last_error: "http_503",
      next_retry_at: "2026-06-14T10:01:00Z",
      sent_at: null,
      created_at: "2026-06-14T10:00:00Z",
      updated_at: "2026-06-14T10:00:00Z",
    },
  ]);

  assert.deepEqual(summaries["order-1"], {
    admin: "sent",
    customer: "pending",
  });
  assert.equal(getOrderNotificationOverallStatus(summaries["order-1"]!), "pending");
  assert.equal(getOrderNotificationOverallLabel(summaries["order-1"]!), "Изчаква");
});

test("isOrderNotificationOutboxUnavailable detects missing table errors", () => {
  assert.equal(isOrderNotificationOutboxUnavailable({ code: "42P01" }), true);
  assert.equal(isOrderNotificationOutboxUnavailable({ code: "PGRST205" }), true);
  assert.equal(isOrderNotificationOutboxUnavailable({ code: "22023" }), false);
});
