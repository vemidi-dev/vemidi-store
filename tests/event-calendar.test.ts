import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { calendarDays, calendarEventStatus, calendarEventTime, calendarGroupsInView, calendarMonthOptions, eventDateKey, groupCalendarEvents, isCalendarMonth, shiftCalendarMonth, toCalendarEvent, type CalendarEvent } from "@/lib/events/calendar";
import type { EventRow } from "@/lib/admin/types";

const event = (change: Partial<CalendarEvent> = {}): CalendarEvent => ({ id: "one", title: "Работилница", slug: "workshop", image_url: null, starts_at: "2026-10-18T08:30:00Z", ends_at: "2026-10-18T10:00:00Z", age_group: "6+", available_spots: 4, duration_minutes: 90, priceLabel: "12 €", ...change });

test("calendar layout shares grid height with its scrolling agenda and anchors three month buttons to today", () => {
  const source = readFileSync("components/content/event-calendar.tsx", "utf8");
  assert.match(source, /calendarMonthOptions\(today\.slice\(0, 7\)\)/);
  assert.match(source, /role="group" aria-label="Избери месец"/);
  assert.match(source, /aria-pressed=\{month === value\}/);
  assert.match(source, /aria-label="Година"/);
  assert.match(source, /grid min-w-0 items-stretch/);
  assert.match(source, /absolute inset-0 flex min-h-0 flex-col/);
  assert.match(source, /min-h-0 overflow-y-auto/);
  assert.doesNotMatch(source, /<select|Предишен месец|Следващ месец|>Днес</);
  assert.match(source, /const items = groups\.get\(day\) \?\? \[\]/);
});

test("month buttons contain the current month and next two including year boundaries", () => {
  assert.deepEqual(calendarMonthOptions("2026-10"), ["2026-10", "2026-11", "2026-12"]);
  assert.deepEqual(calendarMonthOptions("2026-12"), ["2026-12", "2027-01", "2027-02"]);
  assert.deepEqual(calendarMonthOptions("1900-01"), ["1900-01", "1900-02", "1900-03"]);
  assert.deepEqual(calendarMonthOptions("2100-12"), ["2100-12"]);
  assert.deepEqual(calendarMonthOptions("invalid"), []);
});

test("visible program includes adjacent-month dates in the grid but excludes days outside it", () => {
  const groups = groupCalendarEvents([
    event({ id: "before", starts_at: "2026-09-27T10:00:00Z" }),
    event({ id: "leading", starts_at: "2026-09-28T10:00:00Z" }),
    event({ id: "inside", starts_at: "2026-10-31T10:00:00Z" }),
    event({ id: "trailing", starts_at: "2026-11-01T10:00:00Z" }),
    event({ id: "after", starts_at: "2026-11-02T10:00:00Z" }),
  ]);
  assert.deepEqual(calendarGroupsInView(groups, "2026-10").flatMap(([, items]) => items.map(item => item.id)), ["leading", "inside", "trailing"]);
  assert.deepEqual(calendarGroupsInView(groups, "invalid"), []);
});

test("month grid has complete Monday-first weeks without unnecessary empty weeks", () => {
  const days = calendarDays("2024-02");
  assert.equal(days.length, 35);
  assert.equal(days[0], "2024-01-29");
  assert.equal(days[34], "2024-03-03");
  assert.ok(days.includes("2024-02-29"));
  assert.equal(new Set(days).size, 35);
  assert.equal(calendarDays("2026-03").length, 42);
  assert.equal(calendarDays("2021-02").length, 28);
  assert.equal(calendarDays("2026-11")[0], "2026-10-26");
});

test("month movement handles year boundaries and rejects malformed or out-of-range input", () => {
  assert.equal(shiftCalendarMonth("2026-12", 1), "2027-01");
  assert.equal(shiftCalendarMonth("2026-01", -1), "2025-12");
  assert.equal(shiftCalendarMonth("1900-01", -1), "1900-01");
  assert.equal(shiftCalendarMonth("2100-12", 1), "2100-12");
  for (const value of ["", "2026-13", "2026-1", "2026-02-01", "2101-01"]) {
    assert.equal(isCalendarMonth(value), false);
    assert.deepEqual(calendarDays(value), []);
  }
});

test("event timestamps are grouped by Sofia day across midnight and DST", () => {
  assert.equal(eventDateKey("2026-10-17T22:30:00Z"), "2026-10-18");
  assert.equal(eventDateKey("2026-12-31T22:30:00Z"), "2027-01-01");
  assert.equal(eventDateKey("2026-03-29T00:30:00Z"), "2026-03-29");
  assert.equal(eventDateKey("2026-03-29T01:30:00Z"), "2026-03-29");
  assert.equal(eventDateKey("invalid"), null);
  const groups = groupCalendarEvents([event({ id: "later", starts_at: "2026-10-18T12:00:00+03:00" }), event({ id: "early", starts_at: "2026-10-18T08:30:00Z" }), event({ id: "undated", starts_at: null })]);
  assert.deepEqual(groups.get("2026-10-18")?.map(item => item.id), ["early", "later"]);
  assert.equal([...groups.values()].flat().length, 2);
});

test("busy calendar days retain every session in chronological order", () => {
  const sessions = Array.from({ length: 6 }, (_, index) => event({ id: String(index), starts_at: `2026-10-31T${String(8 + index).padStart(2, "0")}:00:00Z` }));
  const groups = groupCalendarEvents([...sessions].reverse());
  assert.deepEqual(groups.get("2026-10-31")?.map(item => item.id), ["0", "1", "2", "3", "4", "5"]);
});

test("past/full status and schedules use saved dates, duration and availability", () => {
  const now = Date.parse("2026-10-18T09:00:00Z");
  assert.equal(calendarEventStatus(event(), now), "upcoming");
  assert.equal(calendarEventStatus(event({ available_spots: 0 }), now), "full");
  assert.equal(calendarEventStatus(event(), now + 7200000), "past");
  assert.equal(calendarEventStatus(event({ ends_at: null }), now), "upcoming");
  assert.equal(calendarEventTime(event()), "11:30–13:00");
  assert.equal(calendarEventTime(event({ ends_at: null })), "11:30–13:00");
  assert.equal(calendarEventTime(event({ starts_at: null })), "Часът предстои");
});

test("calendar projection preserves multiline prices without sending booking configuration/content", () => {
  const source = { ...event(), content: "Full article", excerpt: "Summary", price: 16, registration_settings: { allowedTypes: ["child"], age: "optional", questions: [], priceDisplayText: "16 € от ателието\n12 € от вкъщи" } } as unknown as EventRow;
  const projected = toCalendarEvent(source);
  assert.equal(projected.priceLabel, "16 € от ателието\n12 € от вкъщи");
  assert.equal("content" in projected, false);
  assert.equal("registration_settings" in projected, false);
});
