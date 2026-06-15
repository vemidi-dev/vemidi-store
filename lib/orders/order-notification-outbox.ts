import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { OrderRow } from "@/lib/admin/orders";
import {
  computeNextRetryAt,
  isDeliveryReadyForDispatch,
  ORDER_NOTIFICATION_MAX_ATTEMPTS,
  ORDER_NOTIFICATION_PROCESSING_LEASE_MS,
  type OrderNotificationChannel,
  type OrderNotificationDeliveryRow,
  type OrderNotificationDeliveryStatus,
} from "@/lib/orders/order-notification-schedule";
import {
  deliverOrderNotificationChannel,
  type OrderEmailAttempt,
  type OrderNotificationResult,
} from "@/lib/orders/send-order-notifications";

const DELIVERY_TABLE = "order_notification_deliveries";

async function insertDeliveryRow(
  supabase: SupabaseClient,
  orderId: string,
  channel: OrderNotificationChannel,
  status: OrderNotificationDeliveryStatus,
  lastError?: string | null,
) {
  const { error } = await supabase.from(DELIVERY_TABLE).insert({
    order_id: orderId,
    channel,
    status,
    last_error: lastError ?? null,
    next_retry_at: status === "pending" ? new Date().toISOString() : null,
    sent_at: null,
  });

  if (error && error.code !== "23505") {
    throw error;
  }
}

export async function ensureOrderNotificationDeliveries(
  supabase: SupabaseClient,
  order: OrderRow,
) {
  await insertDeliveryRow(supabase, order.id, "admin", "pending");

  if (order.customer_email?.trim()) {
    await insertDeliveryRow(supabase, order.id, "customer", "pending");
  } else {
    await insertDeliveryRow(
      supabase,
      order.id,
      "customer",
      "skipped",
      "no_customer_email",
    );
  }
}

async function loadDeliveryRow(
  supabase: SupabaseClient,
  orderId: string,
  channel: OrderNotificationChannel,
) {
  const { data, error } = await supabase
    .from(DELIVERY_TABLE)
    .select("*")
    .eq("order_id", orderId)
    .eq("channel", channel)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as OrderNotificationDeliveryRow | null) ?? null;
}

async function markDeliverySent(
  supabase: SupabaseClient,
  rowId: string,
  expectedAttemptCount: number,
) {
  const sentAt = new Date().toISOString();
  const { data, error } = await supabase
    .from(DELIVERY_TABLE)
    .update({
      status: "sent",
      sent_at: sentAt,
      last_error: null,
      next_retry_at: null,
      updated_at: sentAt,
    })
    .eq("id", rowId)
    .eq("status", "pending")
    .eq("attempt_count", expectedAttemptCount)
    .select("id")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

async function markDeliverySkipped(
  supabase: SupabaseClient,
  rowId: string,
  reason: string,
  expectedAttemptCount: number,
) {
  const updatedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from(DELIVERY_TABLE)
    .update({
      status: "skipped",
      last_error: reason,
      next_retry_at: null,
      updated_at: updatedAt,
    })
    .eq("id", rowId)
    .eq("status", "pending")
    .eq("attempt_count", expectedAttemptCount)
    .select("id")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

async function markDeliveryRetryOrFailed(
  supabase: SupabaseClient,
  row: OrderNotificationDeliveryRow,
  errorCode: string,
) {
  const updatedAt = new Date().toISOString();
  const failed = row.attempt_count >= ORDER_NOTIFICATION_MAX_ATTEMPTS;
  const nextRetryAt = failed ? null : computeNextRetryAt(row.attempt_count);

  const { error } = await supabase
    .from(DELIVERY_TABLE)
    .update({
      status: failed ? "failed" : "pending",
      last_error: errorCode,
      next_retry_at: nextRetryAt,
      updated_at: updatedAt,
    })
    .eq("id", row.id)
    .eq("status", "pending")
    .eq("attempt_count", row.attempt_count);

  if (error) {
    throw error;
  }

  return failed ? "failed" : "pending";
}

async function claimDeliveryAttempt(
  supabase: SupabaseClient,
  row: OrderNotificationDeliveryRow,
) {
  if (!isDeliveryReadyForDispatch(row)) {
    return null;
  }

  const nextAttemptCount = row.attempt_count + 1;
  const updatedAt = new Date().toISOString();
  const leaseUntil = new Date(
    Date.now() + ORDER_NOTIFICATION_PROCESSING_LEASE_MS,
  ).toISOString();
  const { data, error } = await supabase
    .from(DELIVERY_TABLE)
    .update({
      attempt_count: nextAttemptCount,
      updated_at: updatedAt,
      next_retry_at: leaseUntil,
    })
    .eq("id", row.id)
    .eq("status", "pending")
    .eq("attempt_count", row.attempt_count)
    .select("*")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as OrderNotificationDeliveryRow | null) ?? null;
}

export async function dispatchOrderNotificationChannel(
  supabase: SupabaseClient,
  order: OrderRow,
  channel: OrderNotificationChannel,
): Promise<OrderEmailAttempt | null> {
  const row = await loadDeliveryRow(supabase, order.id, channel);
  if (!row) {
    return null;
  }

  if (row.status === "sent" || row.status === "skipped" || row.status === "failed") {
    return {
      sent: row.status === "sent",
      skipped: row.status === "skipped",
      error: row.last_error ?? undefined,
    };
  }

  const claimed = await claimDeliveryAttempt(supabase, row);
  if (!claimed) {
    return null;
  }

  const attempt = await deliverOrderNotificationChannel(order, channel);

  if (attempt.sent) {
    await markDeliverySent(supabase, claimed.id, claimed.attempt_count);
    return attempt;
  }

  if (attempt.skipped) {
    await markDeliverySkipped(
      supabase,
      claimed.id,
      attempt.error ?? "skipped",
      claimed.attempt_count,
    );
    return attempt;
  }

  await markDeliveryRetryOrFailed(
    supabase,
    claimed,
    attempt.error ?? "unknown",
  );

  return attempt;
}

export async function enqueueAndDispatchOrderNotifications(
  supabase: SupabaseClient,
  order: OrderRow,
): Promise<OrderNotificationResult> {
  await ensureOrderNotificationDeliveries(supabase, order);

  const admin = (await dispatchOrderNotificationChannel(supabase, order, "admin")) ?? {
    sent: false,
    skipped: true,
    error: "not_enqueued",
  };

  const customer = order.customer_email?.trim()
    ? (await dispatchOrderNotificationChannel(supabase, order, "customer")) ?? {
        sent: false,
        skipped: true,
        error: "not_enqueued",
      }
    : { sent: false, skipped: true, error: "no_customer_email" };

  return { admin, customer };
}

export async function loadPendingNotificationDeliveries(
  supabase: SupabaseClient,
  limit = 25,
) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from(DELIVERY_TABLE)
    .select("*")
    .eq("status", "pending")
    .lte("next_retry_at", now)
    .order("next_retry_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []) as OrderNotificationDeliveryRow[];
}

export async function retryPendingOrderNotifications(
  supabase: SupabaseClient,
  {
    limit = 25,
    loadOrder,
  }: {
    limit?: number;
    loadOrder: (orderId: string) => Promise<OrderRow | null>;
  },
) {
  const deliveries = await loadPendingNotificationDeliveries(supabase, limit);
  const results: Array<{
    orderId: string;
    channel: OrderNotificationChannel;
    outcome: OrderEmailAttempt | null;
  }> = [];

  for (const delivery of deliveries) {
    if (!isDeliveryReadyForDispatch(delivery)) {
      continue;
    }

    const order = await loadOrder(delivery.order_id);
    if (!order) {
      continue;
    }

    const outcome = await dispatchOrderNotificationChannel(
      supabase,
      order,
      delivery.channel,
    );

    results.push({
      orderId: delivery.order_id,
      channel: delivery.channel,
      outcome,
    });
  }

  return results;
}

export async function loadOrderNotificationDeliveries(
  supabase: SupabaseClient,
  orderIds: string[],
) {
  const uniqueIds = [...new Set(orderIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return [] as OrderNotificationDeliveryRow[];
  }

  const { data, error } = await supabase
    .from(DELIVERY_TABLE)
    .select("*")
    .in("order_id", uniqueIds);

  if (error) {
    throw error;
  }

  return (data ?? []) as OrderNotificationDeliveryRow[];
}
