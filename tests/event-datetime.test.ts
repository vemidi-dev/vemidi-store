import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { eventDateTimeDisplay, parseEventDateTime, toEventDateTimeLocal } from "@/lib/events/event-datetime";

test("Sofia local event times convert correctly in summer and winter", () => {
  assert.equal(parseEventDateTime("2026-10-18T11:00"), "2026-10-18T08:00:00.000Z");
  assert.equal(parseEventDateTime("2026-12-18T11:00"), "2026-12-18T09:00:00.000Z");
  assert.equal(parseEventDateTime("2026-10-18T00:30"), "2026-10-17T21:30:00.000Z");
});

test("event edit form round-trips the saved Sofia hour", () => {
  for (const local of ["2026-10-18T11:00", "2026-12-18T11:00", "2026-10-18T23:30"]) {
    const utc = parseEventDateTime(local);
    assert.ok(utc);
    assert.equal(toEventDateTimeLocal(utc), local);
  }
});

test("reject nonexistent clock-change time and invalid calendar dates", () => {
  assert.equal(parseEventDateTime("2026-03-29T03:30"), undefined);
  assert.equal(parseEventDateTime("2026-02-30T11:00"), undefined);
  assert.equal(parseEventDateTime("2026-10-18T25:00"), undefined);
  assert.equal(parseEventDateTime("bad"), undefined);
  assert.equal(parseEventDateTime(""), null);
  assert.equal(toEventDateTimeLocal(null), "");
});

test("ambiguous autumn hour has a deterministic round-trip", () => {
  const utc = parseEventDateTime("2026-10-25T03:30");
  assert.equal(utc, "2026-10-25T00:30:00.000Z");
  assert.equal(toEventDateTimeLocal(utc!), "2026-10-25T03:30");
});

test("Bulgarian day/month/year input uses 24-hour Sofia time and round-trips legacy drafts", () => {
  for (const value of ["2026-10-18T13:00", "2026-12-31T23:59", "2027-01-01T00:00"]) {
    const display = eventDateTimeDisplay(value);
    assert.match(display, /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);
    assert.equal(parseEventDateTime(display), parseEventDateTime(value));
    assert.equal(eventDateTimeDisplay(display), display);
  }
  assert.equal(eventDateTimeDisplay("2026-10-18T13:00"), "18/10/2026 13:00");
  for (const value of ["30/02/2026 13:00", "18/10/2026 24:00", "18/10/2026 13:60", "29/03/2026 03:30", "10/18/2026 13:00", "18/10/2026 01:00 PM"]) assert.equal(parseEventDateTime(value), undefined);
});

test("event create/edit surfaces use the explicit Bulgarian date field rather than a locale-dependent input", () => {
  for (const path of ["event-management-panel", "event-list-view", "content-management-panel"]) {
    const source = readFileSync(`components/admin/${path}.tsx`, "utf8");
    assert.match(source, /<EventDateTimeInput name="starts_at"/);
    assert.match(source, /<EventDateTimeInput name="ends_at"/);
    assert.doesNotMatch(source, /type="datetime-local"/);
  }
  const input = readFileSync("components/admin/event-datetime-input.tsx", "utf8");
  assert.match(input, /event-draft-restored/);
  assert.match(input, /ДД\/ММ\/ГГГГ ЧЧ:ММ/);
  assert.match(input, /parseEventDateTime\(field\.value\)/);
});
