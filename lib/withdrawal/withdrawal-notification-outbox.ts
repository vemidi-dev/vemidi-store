import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getResendConfig, sendEmail } from "@/lib/orders/send-order-notifications";
import {
  computeNextRetryAt,
  isDeliveryReadyForDispatch,
  ORDER_NOTIFICATION_MAX_ATTEMPTS,
  ORDER_NOTIFICATION_PROCESSING_LEASE_MS,
  type OrderNotificationDeliveryStatus,
} from "@/lib/orders/order-notification-schedule";
import {
  buildWithdrawalAdminEmail,
  buildWithdrawalCustomerEmail,
  type WithdrawalRequestRow,
} from "@/lib/withdrawal/withdrawal-email";

const DELIVERY_TABLE = "withdrawal_notification_deliveries";

export type WithdrawalNotificationChannel = "admin" | "customer";

type WithdrawalDeliveryRow = {
  id: string;
  withdrawal_request_id: string;
  channel: WithdrawalNotificationChannel;
  status: OrderNotificationDeliveryStatus;
  attempt_count: number;
  last_error: string | null;
  next_retry_at: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
};

async function insertDeliveryRow(
  supabase: SupabaseClient,
  withdrawalRequestId: string,
  channel: WithdrawalNotificationChannel,
  status: OrderNotificationDeliveryStatus,
  lastError?: string | null,
) {
  const { error } = await supabase.from(DELIVERY_TABLE).insert({
    withdrawal_request_id: withdrawalRequestId,
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

async function loadDeliveryRow(
  supabase: SupabaseClient,
  withdrawalRequestId: string,
  channel: WithdrawalNotificationChannel,
) {
  const { data, error } = await supabase
    .from(DELIVERY_TABLE)
    .select("*")
    .eq("withdrawal_request_id", withdrawalRequestId)
    .eq("channel", channel)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as WithdrawalDeliveryRow | null) ?? null;
}

async function markDeliverySent(
  supabase: SupabaseClient,
  deliveryId: string,
  attemptCount: number,
) {
  const updatedAt = new Date().toISOString();
  const { error } = await supabase
    .from(DELIVERY_TABLE)
    .update({
      status: "sent",
      sent_at: updatedAt,
      updated_at: updatedAt,
      last_error: null,
      next_retry_at: null,
    })
    .eq("id", deliveryId)
    .eq("status", "pending")
    .eq("attempt_count", attemptCount);

  if (error) {
    throw error;
  }
}

async function markDeliverySkipped(
  supabase: SupabaseClient,
  deliveryId: string,
  attemptCount: number,
  errorCode: string,
) {
  const updatedAt = new Date().toISOString();
  const { error } = await supabase
    .from(DELIVERY_TABLE)
    .update({
      status: "skipped",
      last_error: errorCode,
      next_retry_at: null,
      updated_at: updatedAt,
    })
    .eq("id", deliveryId)
    .eq("status", "pending")
    .eq("attempt_count", attemptCount);

  if (error) {
    throw error;
  }
}

async function markDeliveryRetryOrFailed(
  supabase: SupabaseClient,
  row: WithdrawalDeliveryRow,
  errorCode: string,
) {
  const failed = row.attempt_count >= ORDER_NOTIFICATION_MAX_ATTEMPTS;
  const nextRetryAt = failed ? null : computeNextRetryAt(row.attempt_count);
  const updatedAt = new Date().toISOString();
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
}

async function claimDeliveryAttempt(
  supabase: SupabaseClient,
  row: WithdrawalDeliveryRow,
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

  return (data as WithdrawalDeliveryRow | null) ?? null;
}

async function deliverWithdrawalNotificationChannel(
  request: WithdrawalRequestRow,
  channel: WithdrawalNotificationChannel,
) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
  const { adminTo } = getResendConfig();

  if (channel === "admin") {
    const adminUrl = new URL("/admin?tab=withdrawals", siteUrl).toString();
    const adminEmail = buildWithdrawalAdminEmail(request, adminUrl);
    return sendEmail({
      to: [adminTo],
      subject: adminEmail.subject,
      html: adminEmail.html,
      idempotencyKey: `withdrawal-notification:${request.id}:admin`,
    });
  }

  const customerEmail = request.contact_email?.trim();
  if (!customerEmail) {
    return { sent: false, skipped: true, error: "no_customer_email" };
  }

  const customerMessage = buildWithdrawalCustomerEmail(request);
  return sendEmail({
    to: [customerEmail],
    subject: customerMessage.subject,
    html: customerMessage.html,
    idempotencyKey: `withdrawal-notification:${request.id}:customer`,
  });
}

export async function ensureWithdrawalNotificationDeliveries(
  supabase: SupabaseClient,
  request: WithdrawalRequestRow,
) {
  await insertDeliveryRow(supabase, request.id, "admin", "pending");

  if (request.contact_email?.trim()) {
    await insertDeliveryRow(supabase, request.id, "customer", "pending");
  } else {
    await insertDeliveryRow(
      supabase,
      request.id,
      "customer",
      "skipped",
      "no_customer_email",
    );
  }
}

export async function dispatchWithdrawalNotificationChannel(
  supabase: SupabaseClient,
  request: WithdrawalRequestRow,
  channel: WithdrawalNotificationChannel,
) {
  const row = await loadDeliveryRow(supabase, request.id, channel);
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

  const attempt = await deliverWithdrawalNotificationChannel(request, channel);

  if (attempt.sent) {
    await markDeliverySent(supabase, claimed.id, claimed.attempt_count);
    return attempt;
  }

  if (attempt.skipped) {
    await markDeliverySkipped(
      supabase,
      claimed.id,
      claimed.attempt_count,
      attempt.error ?? "skipped",
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

export async function enqueueAndDispatchWithdrawalNotifications(
  supabase: SupabaseClient,
  request: WithdrawalRequestRow,
) {
  await ensureWithdrawalNotificationDeliveries(supabase, request);

  await dispatchWithdrawalNotificationChannel(supabase, request, "admin");
  await dispatchWithdrawalNotificationChannel(supabase, request, "customer");
}

export async function loadPendingWithdrawalNotificationDeliveries(
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

  return (data ?? []) as WithdrawalDeliveryRow[];
}

export async function retryPendingWithdrawalNotifications(
  supabase: SupabaseClient,
  {
    limit = 25,
    loadRequest,
  }: {
    limit?: number;
    loadRequest: (requestId: string) => Promise<WithdrawalRequestRow | null>;
  },
) {
  const deliveries = await loadPendingWithdrawalNotificationDeliveries(
    supabase,
    limit,
  );
  const results: Array<{
    withdrawalRequestId: string;
    channel: WithdrawalNotificationChannel;
    outcome: Awaited<ReturnType<typeof dispatchWithdrawalNotificationChannel>>;
  }> = [];

  for (const delivery of deliveries) {
    if (!isDeliveryReadyForDispatch(delivery)) {
      continue;
    }

    const request = await loadRequest(delivery.withdrawal_request_id);
    if (!request) {
      continue;
    }

    const outcome = await dispatchWithdrawalNotificationChannel(
      supabase,
      request,
      delivery.channel,
    );

    results.push({
      withdrawalRequestId: delivery.withdrawal_request_id,
      channel: delivery.channel,
      outcome,
    });
  }

  return results;
}
