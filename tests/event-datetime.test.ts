import assert from "node:assert/strict";
import test from "node:test";
import { parseEventDateTime, toEventDateTimeLocal } from "@/lib/events/event-datetime";

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
