import type { OrderRow } from "@/lib/admin/orders";
import {
  buildAdminOrderEmail,
  buildCustomerOrderEmail,
} from "@/lib/orders/order-email";
import { siteConfig } from "@/config/site";

/**
 * Future work: durable retry/outbox for order notifications when Resend is down.
 * Orders must remain successful even when email delivery fails.
 */

export const RESEND_REQUEST_TIMEOUT_MS = 10_000;

export type OrderEmailAttempt = {
  sent: boolean;
  skipped: boolean;
  error?: string;
};

export type OrderNotificationResult = {
  admin: OrderEmailAttempt;
  customer: OrderEmailAttempt;
};

type SendEmailInput = {
  to: string[];
  subject: string;
  html: string;
};

function getResendConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.ORDER_NOTIFICATION_FROM?.trim() ||
    `${siteConfig.name} <onboarding@resend.dev>`;
  const adminTo =
    process.env.ORDER_NOTIFICATION_TO?.trim() || siteConfig.business.email;

  return { apiKey, from, adminTo };
}

async function sendEmail({
  to,
  subject,
  html,
}: SendEmailInput): Promise<OrderEmailAttempt> {
  const { apiKey, from } = getResendConfig();
  if (!apiKey) {
    console.warn("Order email skipped: RESEND_API_KEY is not configured.");
    return { sent: false, skipped: true, error: "not_configured" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RESEND_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        html,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return { sent: false, skipped: false, error: `http_${response.status}` };
    }

    return { sent: true, skipped: false };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { sent: false, skipped: false, error: "timeout" };
    }

    return { sent: false, skipped: false, error: "network" };
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendOrderNotifications(
  order: OrderRow,
): Promise<OrderNotificationResult> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
  const adminOrdersUrl = new URL("/admin?tab=orders", siteUrl).toString();
  const { adminTo } = getResendConfig();

  const adminEmail = buildAdminOrderEmail(order, adminOrdersUrl);
  const adminResult = await sendEmail({
    to: [adminTo],
    subject: adminEmail.subject,
    html: adminEmail.html,
  });

  if (!adminResult.sent && !adminResult.skipped) {
    console.error("Order admin email failed", {
      orderId: order.id,
      error: adminResult.error,
    });
  }

  const customerEmail = order.customer_email?.trim();
  if (!customerEmail) {
    return {
      admin: adminResult,
      customer: { sent: false, skipped: true, error: "no_customer_email" },
    };
  }

  const customerMessage = buildCustomerOrderEmail(order);
  const customerResult = await sendEmail({
    to: [customerEmail],
    subject: customerMessage.subject,
    html: customerMessage.html,
  });

  if (!customerResult.sent && !customerResult.skipped) {
    console.error("Order customer email failed", {
      orderId: order.id,
      error: customerResult.error,
    });
  }

  return {
    admin: adminResult,
    customer: customerResult,
  };
}
