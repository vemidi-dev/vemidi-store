import assert from "node:assert/strict";
import test from "node:test";

import type { EventRow } from "@/lib/admin/types";
import {
  buildEventLocation,
  buildEventSchema,
  normalizeEventFormat,
} from "@/lib/seo/event-schema";
import { compactJsonLd } from "@/lib/seo/json-ld";

const siteUrl = new URL("https://vemidi-store.vercel.app");
const upcomingReference = new Date("2026-07-01T10:00:00.000Z");
const afterEventReference = new Date("2026-08-02T12:00:00.000Z");

const baseEvent: EventRow = {
  id: "event-1",
  title: "Творчески атelier",
  slug: "tvorcheski-atelier",
  excerpt: "Ръчна работа за деца и родители.",
  content: "Подробности.",
  image_url: "https://cdn.example.com/events/ateliene.jpg",
  event_type: "workshop",
  audience: "family",
  format: "in_person",
  price: 25,
  capacity: 12,
  available_spots: 4,
  age_group: "6+",
  address: "София, ул. Пример 1",
  duration_minutes: 90,
  includes_text: "Материали",
  materials_text: null,
  host_name: "Мария",
  cancellation_policy: null,
  registration_url: null,
  location: "VeMiDi crafts атelier",
  starts_at: "2026-08-01T10:00:00.000Z",
  ends_at: "2026-08-01T11:30:00.000Z",
  is_published: true,
  created_at: "2026-01-01T10:00:00.000Z",
  updated_at: "2026-01-02T10:00:00.000Z",
};

test("event schema includes real schedule, location, offer and organizer", () => {
  const schema = buildEventSchema(baseEvent, siteUrl, upcomingReference);

  assert.ok(schema);
  assert.equal(schema["@type"], "Event");
  assert.equal(schema.name, baseEvent.title);
  assert.equal(schema.description, baseEvent.excerpt);
  assert.equal(schema.startDate, baseEvent.starts_at);
  assert.equal(schema.endDate, baseEvent.ends_at);
  assert.equal((schema.location as { name: string }).name, "VeMiDi crafts атelier");
  assert.equal((schema.offers as { price: string }).price, "25.00");
  assert.equal((schema.offers as { priceCurrency: string }).priceCurrency, "EUR");
  assert.equal((schema.offers as { availability: string }).availability, "https://schema.org/InStock");
  assert.equal((schema.organizer as { name: string }).name, "Мария");
  assert.equal(
    schema.eventAttendanceMode,
    "https://schema.org/OfflineEventAttendanceMode",
  );
  assert.equal("eventStatus" in schema, false);
});

test("past event omits offer instead of reporting InStock", () => {
  const schema = compactJsonLd(
    buildEventSchema(baseEvent, siteUrl, afterEventReference),
  ) as Record<string, unknown>;

  assert.ok(schema);
  assert.equal("offers" in schema, false);
  assert.equal("eventStatus" in schema, false);
});

test("sold out upcoming event uses SoldOut availability", () => {
  const schema = buildEventSchema(
    { ...baseEvent, available_spots: 0 },
    siteUrl,
    upcomingReference,
  );

  assert.ok(schema);
  assert.equal(
    (schema.offers as { availability: string }).availability,
    "https://schema.org/SoldOut",
  );
});

test("normalizeEventFormat recognizes Bulgarian and stored format values", () => {
  assert.equal(normalizeEventFormat("online"), "online");
  assert.equal(normalizeEventFormat("Онлайн"), "online");
  assert.equal(normalizeEventFormat("in_person"), "offline");
  assert.equal(normalizeEventFormat("На място"), "offline");
  assert.equal(normalizeEventFormat("hybrid"), "hybrid");
  assert.equal(normalizeEventFormat("Хибрид"), "hybrid");
});

test("online event uses VirtualLocation only with a real registration URL", () => {
  const withUrl = buildEventLocation(
    {
      ...baseEvent,
      format: "online",
      location: null,
      address: null,
      registration_url: "https://meet.example.com/workshop",
    },
    "online",
  ) as { "@type": string; url: string };

  assert.equal(withUrl["@type"], "VirtualLocation");
  assert.equal(withUrl.url, "https://meet.example.com/workshop");

  assert.equal(
    buildEventLocation(
      { ...baseEvent, format: "online", location: null, address: null, registration_url: null },
      "online",
    ),
    undefined,
  );
});

test("hybrid event can expose both physical and virtual locations", () => {
  const location = buildEventLocation(
    {
      ...baseEvent,
      format: "hybrid",
      registration_url: "https://meet.example.com/hybrid",
    },
    "hybrid",
  ) as Array<{ "@type": string }>;

  assert.equal(location.length, 2);
  assert.equal(location[0]["@type"], "Place");
  assert.equal(location[1]["@type"], "VirtualLocation");
});

test("event schema returns null when required startDate or location data is missing", () => {
  assert.equal(
    buildEventSchema({ ...baseEvent, starts_at: null }, siteUrl, upcomingReference),
    null,
  );

  assert.equal(
    buildEventSchema(
      {
        ...baseEvent,
        format: "online",
        location: null,
        address: null,
        registration_url: null,
      },
      siteUrl,
      upcomingReference,
    ),
    null,
  );
});

test("event schema omits offer when price is missing", () => {
  const schema = compactJsonLd(
    buildEventSchema({ ...baseEvent, price: null }, siteUrl, upcomingReference),
  ) as Record<string, unknown>;

  assert.equal("offers" in schema, false);
});

test("event schema omits unknown attendance mode", () => {
  const schema = compactJsonLd(
    buildEventSchema({ ...baseEvent, format: null }, siteUrl, upcomingReference),
  ) as Record<string, unknown>;

  assert.equal("eventAttendanceMode" in schema, false);
});
