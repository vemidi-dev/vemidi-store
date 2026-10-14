import assert from "node:assert/strict";
import test from "node:test";

import { buildAdminEventRegistrationEmail, buildCustomerEventRegistrationEmail, type EventRegistrationEmailInput } from "@/lib/events/event-registration-email";
import { sendEventRegistrationNotifications } from "@/lib/events/send-event-registration-notifications";

const customerInput: EventRegistrationEmailInput = {
  eventTitle: "Есенна работилница", eventSlug: "esenna-rabotilnitsa", eventStartsAt: "2026-10-20T14:00:00Z",
  eventLocation: "Ателие", eventAddress: "Младост 2, София", fullName: "Мария Иванова", phone: "0888123456",
  email: "maria@example.com", participantCount: 2, note: "Бележка",
};

test("admin event registration email includes participant and admin details", () => {
  const email = buildAdminEventRegistrationEmail(
    {
      eventTitle: "Есенна работилница",
      eventSlug: "esenna-rabotilnitsa",
      eventStartsAt: "2026-10-20T14:00:00.000Z",
      eventLocation: "Младост 2, София",
      fullName: "Мария Иванова",
      phone: "0888123456",
      email: "maria@example.com",
      participantCount: 2,
      note: "Анна, 7 г.",
    },
    "https://vemidi-crafts.com/admin?tab=events",
  );

  assert.match(email.subject, /Ново записване за събитие/);
  assert.match(email.subject, /Есенна работилница/);
  assert.match(email.html, /Мария Иванова/);
  assert.match(email.html, /0888123456/);
  assert.match(email.html, /Анна, 7 г\./);
  assert.match(email.html, /https:\/\/vemidi-crafts.com\/admin\?tab=events/);
});

test("admin event registration email escapes submitted text", () => {
  const email = buildAdminEventRegistrationEmail(
    {
      eventTitle: "<script>bad</script>",
      eventSlug: "event",
      eventStartsAt: null,
      eventLocation: null,
      fullName: "Иван <b>",
      phone: "0888",
      email: null,
      participantCount: 1,
      note: "ред 1\n<script>",
    },
    "https://example.com/admin?tab=events",
  );

  assert.doesNotMatch(email.html, /<script>/);
  assert.match(email.html, /&lt;script&gt;bad&lt;\/script&gt;/);
  assert.match(email.html, /ред 1<br \/>/);
});

test("customer confirmation includes local date, address, seats and public link without admin information", () => {
  const email = buildCustomerEventRegistrationEmail(customerInput, "https://vemidi-crafts.com/sabitiya/esenna-rabotilnitsa");
  assert.match(email.html, /20 октомври 2026/);
  assert.match(email.html, /17:00/);
  assert.match(email.html, /Младост 2, София/);
  assert.match(email.html, /Мария Иванова/);
  assert.match(email.html, /Брой участници/);
  assert.match(email.html, /\/sabitiya\/esenna-rabotilnitsa/);
  assert.match(email.html, /Ще ви очакваме на място/);
  assert.doesNotMatch(email.html, /\/admin|Ново записване|Бележка/);
});

test("customer confirmation escapes user content and omits missing location and schedule", () => {
  const email = buildCustomerEventRegistrationEmail({ ...customerInput, eventTitle: "<script>\nbad</script>", fullName: "<b>Иван</b>", eventLocation: null, eventAddress: null, eventStartsAt: null }, "https://example.com/event");
  assert.doesNotMatch(email.html, /<script>|<b>|Дата и час|Адрес|Не е попълнено/);
  assert.match(email.html, /&lt;b&gt;Иван&lt;\/b&gt;/);
  assert.doesNotMatch(email.subject, /\n/);
});

test("notification sends to distinct recipients with stable channel keys", async () => {
  const messages: { to: string[]; idempotencyKey: string; html: string }[] = [];
  const result = await sendEventRegistrationNotifications("registration-1", customerInput, {
    siteUrl: new URL("https://example.com"), adminTo: "admin@example.com",
    send: async (message) => { messages.push(message); return { sent: true, skipped: false }; },
  });
  assert.equal(result.customer.sent, true);
  assert.equal(result.admin.sent, true);
  assert.deepEqual(messages.map((message) => message.to), [["admin@example.com"], ["maria@example.com"]]);
  assert.deepEqual(messages.map((message) => message.idempotencyKey), ["event-registration:registration-1:admin", "event-registration:registration-1:customer"]);
  assert.doesNotMatch(messages[1].html, /\/admin/);
});

test("admin delivery failure does not prevent sending customer confirmation", async () => {
  const result = await sendEventRegistrationNotifications("registration-1", customerInput, {
    siteUrl: new URL("https://example.com"), adminTo: "admin@example.com",
    send: async (message) => { if (message.to[0] === "admin@example.com") throw new Error("network"); return { sent: true, skipped: false }; },
  });
  assert.equal(result.admin.sent, false);
  assert.equal(result.customer.sent, true);
});

test("registration without customer email sends only admin notification", async () => {
  const recipients: string[] = [];
  const result = await sendEventRegistrationNotifications("registration-1", { ...customerInput, email: null }, {
    siteUrl: new URL("https://example.com"), adminTo: "admin@example.com",
    send: async (message) => { recipients.push(...message.to); return { sent: true, skipped: false }; },
  });
  assert.deepEqual(recipients, ["admin@example.com"]);
  assert.equal(result.customer.skipped, true);
});
