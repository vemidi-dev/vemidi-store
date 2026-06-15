import assert from "node:assert/strict";
import test from "node:test";

import {
  buildOccasionPageMetadata,
  findOccasionCategory,
  resolveOccasionPageMetadata,
} from "@/lib/seo/occasion-metadata";
import type { StorefrontCategory } from "@/lib/storefront/types";

const categories: StorefrontCategory[] = [
  {
    id: "occ-1",
    name: "Сватба",
    slug: "svatba",
    category_type: "occasion",
    parent_id: null,
    show_on_home: true,
    home_sort_order: 1,
    card_description: "Подаръци за сватбен ден.",
    createdAt: "2026-01-01T10:00:00.000Z",
  },
];

const occasion = categories[0];

test("occasion metadata is indexable when products exist", () => {
  const metadata = buildOccasionPageMetadata({
    occasion,
    productCategorySlugs: [["svatba"]],
  });

  assert.equal(metadata.title, "Сватба");
  assert.equal(metadata.description, "Подаръци за сватбен ден.");
  assert.equal(metadata.alternates?.canonical, "/occasions/svatba");
  assert.deepEqual(metadata.robots, { index: true, follow: true });
  assert.equal(metadata.openGraph?.title, "Сватба");
  assert.equal(metadata.twitter?.title, "Сватба");
});

test("empty occasion metadata is noindex", () => {
  const metadata = buildOccasionPageMetadata({
    occasion,
    productCategorySlugs: [],
  });

  assert.deepEqual(metadata.robots, { index: false, follow: true });
});

test("filtered occasion metadata is noindex with the clean canonical", () => {
  const metadata = buildOccasionPageMetadata({
    occasion,
    productCategorySlugs: [["svatba"]],
    faceted: true,
  });

  assert.deepEqual(metadata.robots, { index: false, follow: true });
  assert.equal(metadata.alternates?.canonical, "/occasions/svatba");
});

test("invalid occasion slug is absent from catalog lookup used by page notFound", () => {
  assert.equal(findOccasionCategory(categories, "missing-slug"), null);
});

test("resolveOccasionPageMetadata still documents invalid slug metadata helper", () => {
  const metadata = resolveOccasionPageMetadata(
    "missing-slug",
    categories,
    [],
  );

  assert.equal(metadata.title, "Поводът не е намерен");
  assert.deepEqual(metadata.robots, { index: false, follow: true });
});
