import { buildAdminEventRegistrationEmail, buildCustomerEventRegistrationEmail, type EventRegistrationEmailInput } from "@/lib/events/event-registration-email";
import type { OrderEmailAttempt } from "@/lib/orders/send-order-notifications";

type EmailSender = (input: { to: string[]; subject: string; html: string; idempotencyKey: string }) => Promise<OrderEmailAttempt>;

export async function sendEventRegistrationNotifications(
  registrationId: string,
  input: EventRegistrationEmailInput,
  { siteUrl, adminTo, send }: { siteUrl: URL; adminTo: string; send: EmailSender },
) {
  const adminMessage = buildAdminEventRegistrationEmail(input, new URL("/admin?tab=events&eventsView=participants", siteUrl).toString());
  const customerMessage = buildCustomerEventRegistrationEmail(input, new URL(`/sabitiya/${encodeURIComponent(input.eventSlug)}`, siteUrl).toString());

  async function deliver(to: string, message: typeof adminMessage, channel: string): Promise<OrderEmailAttempt> {
    try {
      return await send({ to: [to], ...message, idempotencyKey: `event-registration:${registrationId}:${channel}` });
    } catch {
      return { sent: false, skipped: false, error: "network" };
    }
  }

  const [admin, customer] = await Promise.all([
    deliver(adminTo, adminMessage, "admin"),
    input.email
      ? deliver(input.email, customerMessage, "customer")
      : Promise.resolve({ sent: false, skipped: true, error: "no_customer_email" }),
  ]);
  return { admin, customer };
}
