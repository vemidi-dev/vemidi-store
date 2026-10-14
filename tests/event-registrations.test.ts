import assert from "node:assert/strict";
import test from "node:test";

import type { EventRegistrationRow } from "@/lib/admin/types";
import { filterEventRegistrations, getEventRegistrationCounts } from "@/lib/admin/event-registrations";
import { updateEventRegistrationStatus } from "@/app/admin/event-registration-actions";

const base: EventRegistrationRow = {
  id: "test-1", event_id: "event-1", full_name: "Мария Иванова", phone: "+359 (888) 123-456",
  email: "maria@example.com", participant_count: 2, note: "Дете на 7 години", status: "new",
  created_at: "2026-10-14T12:00:00Z", updated_at: "2026-10-14T12:00:00Z",
};
const rows: EventRegistrationRow[] = [base, { ...base, id: "test-2", event_id: "event-2", status: "cancelled", participant_count: 5 }, { ...base, id: "test-3", status: "confirmed", participant_count: 3 }];

test("registration filters combine event, status and case-insensitive text", () => {
  assert.deepEqual(filterEventRegistrations(rows, { eventId: "event-1", status: "confirmed", search: "МАРИЯ" }).map((row) => row.id), ["test-3"]);
  assert.equal(filterEventRegistrations(rows, { eventId: "", status: "", search: "7 години" }).length, 3);
  assert.equal(filterEventRegistrations(rows, { eventId: "", status: "", search: "unknown@example.com" }).length, 0);
});

test("phone search ignores formatting", () => {
  assert.equal(filterEventRegistrations(rows, { eventId: "", status: "", search: "888123456" }).length, 3);
});

test("cancelled registrations never count toward active participants", () => {
  assert.deepEqual(getEventRegistrationCounts(rows), { total: 3, participants: 5, new: 1, confirmed: 1, cancelled: 1 });
  assert.equal(getEventRegistrationCounts(rows.map((row) => ({ ...row, status: "cancelled" }))).participants, 0);
});

test("invalid status returns an inline failure without redirect", async () => {
  const form = new FormData();
  form.set("id", "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
  form.set("status", "unknown");
  const result = await updateEventRegistrationStatus(form);
  assert.equal(result.ok, false);
  assert.match(result.message, /Невалиден статус/);
});
