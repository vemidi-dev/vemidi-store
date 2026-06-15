export const ORDER_NOTIFICATION_MAX_ATTEMPTS = 5;

/** Short lease while an attempt is in-flight; enables recovery after crashes. */
export const ORDER_NOTIFICATION_PROCESSING_LEASE_MS = 120_000;

/** Backoff delays in milliseconds after each failed attempt (1-based index). */
export const ORDER_NOTIFICATION_RETRY_DELAYS_MS = [
  60_000,
  5 * 60_000,
  15 * 60_000,
  30 * 60_000,
  60 * 60_000,
] as const;

export type OrderNotificationChannel = "admin" | "customer";

export type OrderNotificationDeliveryStatus =
  | "pending"
  | "sent"
  | "skipped"
  | "failed";

export type OrderNotificationDeliveryRow = {
  id: string;
  order_id: string;
  channel: OrderNotificationChannel;
  status: OrderNotificationDeliveryStatus;
  attempt_count: number;
  last_error: string | null;
  next_retry_at: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
};

export function computeNextRetryAt(
  attemptCount: number,
  now = Date.now(),
): string | null {
  if (attemptCount >= ORDER_NOTIFICATION_MAX_ATTEMPTS) {
    return null;
  }

  const delay =
    ORDER_NOTIFICATION_RETRY_DELAYS_MS[
      Math.min(attemptCount, ORDER_NOTIFICATION_RETRY_DELAYS_MS.length - 1)
    ];

  return new Date(now + delay).toISOString();
}

export function isDeliveryReadyForDispatch(
  row: Pick<
    OrderNotificationDeliveryRow,
    "status" | "attempt_count" | "next_retry_at"
  >,
  now = Date.now(),
): boolean {
  if (row.status !== "pending") {
    return false;
  }

  if (row.attempt_count >= ORDER_NOTIFICATION_MAX_ATTEMPTS) {
    return false;
  }

  if (!row.next_retry_at) {
    return true;
  }

  return Date.parse(row.next_retry_at) <= now;
}

export function isOrderNotificationOutboxUnavailable(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return false;
  }

  const code = String((error as { code?: string }).code);
  return code === "42P01" || code === "PGRST205";
}
