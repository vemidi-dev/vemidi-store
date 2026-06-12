import assert from "node:assert/strict";
import test from "node:test";

import {
  eventHasCoverImage,
  filterEvents,
  formatEventPeriod,
  getEventLifecycleStatus,
  sortEvents,
} from "@/lib/event-admin";
import type { EventRow } from "@/lib/admin/types";

const baseEvent: EventRow = {
  id: "1",
  title: "Работилница за деца",
  slug: "rabotilnitsa",
  excerpt: "Кратко",
  content: "Пълен текст",
  image_url: "https://example.com/cover.jpg",
  event_type: "Работилница",
  audience: "Деца",
  format: "in_person",
  price: 20,
  capacity: 10,
  available_spots: 5,
  age_group: null,
  address: null,
  duration_minutes: 90,
  includes_text: null,
  materials_text: null,
  host_name: null,
  cancellation_policy: null,
  registration_url: null,
  location: "София",
  starts_at: "2026-07-01T10:00:00.000Z",
  ends_at: "2026-07-01T12:00:00.000Z",
  is_published: true,
  created_at: "2026-06-01T10:00:00.000Z",
  updated_at: "2026-06-01T10:00:00.000Z",
};

test("event lifecycle status reflects publish state and dates", () => {
  const now = new Date("2026-06-10T12:00:00.000Z");

  assert.equal(getEventLifecycleStatus(baseEvent, now), "upcoming");
  assert.equal(
    getEventLifecycleStatus({ ...baseEvent, is_published: false }, now),
    "draft",
  );
  assert.equal(
    getEventLifecycleStatus(
      {
        ...baseEvent,
        starts_at: "2026-06-09T10:00:00.000Z",
        ends_at: "2026-06-11T10:00:00.000Z",
      },
      now,
    ),
    "active",
  );
  assert.equal(
    getEventLifecycleStatus(
      {
        ...baseEvent,
        starts_at: "2026-05-01T10:00:00.000Z",
        ends_at: "2026-05-02T10:00:00.000Z",
      },
      now,
    ),
    "ended",
  );
});

test("event filters combine title search, publish and period filters", () => {
  const events: EventRow[] = [
    baseEvent,
    {
      ...baseEvent,
      id: "2",
      title: "Чернова базар",
      slug: "bazar",
      is_published: false,
    },
  ];
  const now = new Date("2026-06-10T12:00:00.000Z");

  assert.deepEqual(
    filterEvents(events, { search: "работилница", publish: "all", period: "all" }, now).map(
      (event) => event.id,
    ),
    ["1"],
  );
  assert.deepEqual(
    filterEvents(events, { search: "", publish: "draft", period: "all" }, now).map(
      (event) => event.id,
    ),
    ["2"],
  );
});

test("event sort orders by start date descending by default helper", () => {
  const sorted = sortEvents(
    [
      { ...baseEvent, id: "old", starts_at: "2026-05-01T10:00:00.000Z" },
      { ...baseEvent, id: "new", starts_at: "2026-08-01T10:00:00.000Z" },
    ],
    "starts-desc",
  );

  assert.deepEqual(
    sorted.map((event) => event.id),
    ["new", "old"],
  );
});

test("event cover image helper and period formatting", () => {
  assert.equal(eventHasCoverImage(baseEvent), true);
  assert.equal(eventHasCoverImage({ ...baseEvent, image_url: null }), false);
  assert.match(formatEventPeriod(null, null), /Без период/);
  assert.match(formatEventPeriod(baseEvent.starts_at, baseEvent.ends_at), /2026/);
});
