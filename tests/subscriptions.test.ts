import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSubscriberCsv,
  filterSubscribers,
  getSubscriberCounts,
  normalizeSubscriberStatus,
  normalizeSubscriberTopic,
} from "@/lib/admin/subscriptions";
import type { NewsletterSubscriberRow } from "@/lib/admin/types";

const subscribers: NewsletterSubscriberRow[] = [
  {
    id: "one",
    email: "products@example.com",
    topics: ["products"],
    is_active: true,
    created_at: "2026-06-01T10:00:00.000Z",
    updated_at: "2026-06-01T10:00:00.000Z",
  },
  {
    id: "two",
    email: "creative@example.com",
    topics: ["blog", "events"],
    is_active: true,
    created_at: "2026-06-02T10:00:00.000Z",
    updated_at: "2026-06-02T10:00:00.000Z",
  },
  {
    id: "three",
    email: "inactive@example.com",
    topics: ["blog", "products", "events"],
    is_active: false,
    created_at: "2026-06-03T10:00:00.000Z",
    updated_at: "2026-06-03T10:00:00.000Z",
  },
];

test("subscriber filters normalize unsupported values", () => {
  assert.equal(normalizeSubscriberTopic("blog"), "blog");
  assert.equal(normalizeSubscriberTopic("unknown"), "all");
  assert.equal(normalizeSubscriberStatus("inactive"), "inactive");
  assert.equal(normalizeSubscriberStatus("unknown"), "all");
});

test("subscriber filters combine email, topic and status", () => {
  assert.deepEqual(
    filterSubscribers(subscribers, {
      search: "CREATIVE",
      topic: "events",
      status: "active",
    }).map((subscriber) => subscriber.id),
    ["two"],
  );

  assert.deepEqual(
    filterSubscribers(subscribers, {
      search: "",
      topic: "all",
      status: "inactive",
    }).map((subscriber) => subscriber.id),
    ["three"],
  );
});

test("subscriber counts include only active topic memberships", () => {
  assert.deepEqual(getSubscriberCounts(subscribers), {
    total: 3,
    active: 2,
    inactive: 1,
    products: 1,
    blog: 1,
    events: 1,
  });
});

test("subscriber CSV contains topic columns and prevents spreadsheet formulas", () => {
  const csv = buildSubscriberCsv([
    {
      ...subscribers[0],
      email: "=unsafe@example.com",
      topics: ["products", "blog"],
    },
    subscribers[2],
  ]);

  assert.match(csv, /"имейл","продукти","блог","работилници","статус","добавен_на"/);
  assert.match(csv, /"'=unsafe@example\.com","да","да","не","активен"/);
  assert.match(csv, /"inactive@example\.com","да","да","да","неактивен"/);
});
