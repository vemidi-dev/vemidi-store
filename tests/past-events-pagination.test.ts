import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { comparePastEvents, isPastEventsOffset, PAST_EVENTS_PAGE_SIZE } from "../lib/events/past-events";

test("past workshop batches contain four items and reject invalid offsets", () => {
  assert.equal(PAST_EVENTS_PAGE_SIZE, 4);
  for (const offset of [0, 4, 8, 10000]) assert.equal(isPastEventsOffset(offset), true);
  for (const offset of [-4, 1, 3.5, NaN, Infinity, 10004]) assert.equal(isPastEventsOffset(offset), false);
});

test("past workshops are newest-first with deterministic ties and undated events last", () => {
  const events = [
    { id: "z", starts_at: null },
    { id: "b", starts_at: "2026-10-25T11:00:00Z" },
    { id: "c", starts_at: "2026-10-18T11:00:00Z" },
    { id: "a", starts_at: "2026-10-25T11:00:00Z" },
  ];
  assert.deepEqual(events.sort(comparePastEvents).map((event) => event.id), ["a", "b", "c", "z"]);
});

test("archive renders only its first batch, followed by the photo gallery", () => {
  const page = readFileSync("app/events/page.tsx", "utf8");
  assert.match(page, /events\.slice\(0, PAST_EVENTS_PAGE_SIZE\)/);
  assert.match(page, /<PastEvents events=\{pastEvents\} before=\{now\} \/>\s*<EventGallerySection/);
  assert.match(page, /\.sort\(comparePastEvents\)/);
  const action = readFileSync("app/events/past-events-actions.tsx", "utf8");
  assert.match(action, /isPastEventsOffset\(offset\)/);
  assert.match(action, /\.eq\("is_published", true\)/);
  assert.match(action, /ends_at\.lt\.\$\{cutoff\},and\(ends_at\.is\.null,starts_at\.lt\.\$\{cutoff\}\)/);
  assert.match(action, /\.range\(offset, offset \+ PAST_EVENTS_PAGE_SIZE - 1\)/);
  assert.match(action, /if \(error\) throw/);
});

test("load more prevents duplicate requests, preserves cards on failure and reports progress", () => {
  const grid = readFileSync("components/content/past-events-grid.tsx", "utf8");
  assert.match(grid, /if \(loading\.current\) return/);
  assert.match(grid, /disabled=\{isPending\}/);
  assert.match(grid, /next\.cards\.filter\(\(card\) => !ids\.has\(card\.id\)\)/);
  assert.match(grid, /catch \{\s*setError/);
  assert.match(grid, /role="status"/);
  assert.match(grid, /role="alert"/);
  assert.match(grid, /offset\.current < total/);
  assert.match(grid, /lg:grid-cols-4/);
});
