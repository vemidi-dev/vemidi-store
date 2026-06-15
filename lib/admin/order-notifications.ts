import type {
  OrderNotificationChannel,
  OrderNotificationDeliveryRow,
  OrderNotificationDeliveryStatus,
} from "@/lib/orders/order-notification-schedule";

export type OrderNotificationChannelState =
  | OrderNotificationDeliveryStatus
  | "missing";

export type OrderNotificationSummary = {
  admin: OrderNotificationChannelState;
  customer: OrderNotificationChannelState;
};

const CHANNEL_LABELS: Record<OrderNotificationChannel, string> = {
  admin: "Админ",
  customer: "Клиент",
};

const STATUS_LABELS: Record<OrderNotificationChannelState, string> = {
  pending: "Изчаква",
  sent: "Изпратено",
  skipped: "Пропуснато",
  failed: "Неуспешно",
  missing: "Няма запис",
};

const STATUS_BADGE_CLASS: Record<OrderNotificationChannelState, string> = {
  pending: "bg-amber-50 text-amber-800 border-amber-200",
  sent: "bg-emerald-50 text-emerald-800 border-emerald-200",
  skipped: "bg-boutique-bg text-boutique-muted border-boutique-line",
  failed: "bg-red-50 text-red-700 border-red-200",
  missing: "bg-boutique-bg text-boutique-muted border-boutique-line",
};

export function buildOrderNotificationSummary(
  rows: OrderNotificationDeliveryRow[],
): OrderNotificationSummary {
  const byChannel = new Map(rows.map((row) => [row.channel, row.status]));

  return {
    admin: byChannel.get("admin") ?? "missing",
    customer: byChannel.get("customer") ?? "missing",
  };
}

export function buildOrderNotificationSummaries(
  rows: OrderNotificationDeliveryRow[],
): Record<string, OrderNotificationSummary> {
  const grouped = new Map<string, OrderNotificationDeliveryRow[]>();

  for (const row of rows) {
    const current = grouped.get(row.order_id) ?? [];
    current.push(row);
    grouped.set(row.order_id, current);
  }

  return Object.fromEntries(
    [...grouped.entries()].map(([orderId, orderRows]) => [
      orderId,
      buildOrderNotificationSummary(orderRows),
    ]),
  );
}

export function getOrderNotificationOverallStatus(
  summary: OrderNotificationSummary,
): OrderNotificationChannelState {
  const states = [summary.admin, summary.customer];

  if (states.includes("failed")) {
    return "failed";
  }

  if (states.includes("pending")) {
    return "pending";
  }

  if (states.every((state) => state === "sent" || state === "skipped")) {
    return "sent";
  }

  return "missing";
}

export function getOrderNotificationOverallLabel(summary: OrderNotificationSummary) {
  return STATUS_LABELS[getOrderNotificationOverallStatus(summary)];
}

export function getOrderNotificationChannelLabel(
  channel: OrderNotificationChannel,
  status: OrderNotificationChannelState,
) {
  return `${CHANNEL_LABELS[channel]}: ${STATUS_LABELS[status]}`;
}

export function getOrderNotificationBadgeClass(status: OrderNotificationChannelState) {
  return STATUS_BADGE_CLASS[status];
}
