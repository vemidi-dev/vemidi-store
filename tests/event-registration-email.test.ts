import assert from "node:assert/strict";
import test from "node:test";

import { buildAdminEventRegistrationEmail } from "@/lib/events/event-registration-email";

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
