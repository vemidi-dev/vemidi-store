import type { OrderRow } from "@/lib/admin/orders";
import {
  buildAdminOrderEmail,
  buildCustomerOrderEmail,
} from "@/lib/orders/order-email";
import { siteConfig } from "@/config/site";

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

async function sendEmail({ to, subject, html }: SendEmailInput) {
  const { apiKey, from } = getResendConfig();
  if (!apiKey) {
    console.warn("Order email skipped: RESEND_API_KEY is not configured.");
    return false;
  }

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
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Order email failed:", response.status, errorBody);
    return false;
  }

  return true;
}

export async function sendOrderNotifications(order: OrderRow) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
  const adminOrdersUrl = new URL("/admin?tab=orders", siteUrl).toString();
  const { adminTo } = getResendConfig();

  const adminEmail = buildAdminOrderEmail(order, adminOrdersUrl);
  await sendEmail({
    to: [adminTo],
    subject: adminEmail.subject,
    html: adminEmail.html,
  });

  const customerEmail = order.customer_email?.trim();
  if (!customerEmail) {
    return;
  }

  const customerMessage = buildCustomerOrderEmail(order);
  await sendEmail({
    to: [customerEmail],
    subject: customerMessage.subject,
    html: customerMessage.html,
  });
}
