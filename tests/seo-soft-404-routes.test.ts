import assert from "node:assert/strict";
import test from "node:test";

import { metadata as categoriesHubMetadata } from "@/app/categories/page";
import { isUuid } from "@/lib/is-uuid";
import { notFoundPageMetadata } from "@/lib/seo/page-metadata";
import { resolveOccasionPageMetadata } from "@/lib/seo/occasion-metadata";
import type { StorefrontCategory } from "@/lib/storefront/types";

const categories: StorefrontCategory[] = [
  {
    id: "cat-1",
    name: "Сватба",
    slug: "svatba",
    category_type: "occasion",
    parent_id: null,
    show_on_home: true,
    home_sort_order: 1,
    card_description: null,
    createdAt: null,
  },
];

test("invalid dynamic routes rely on notFoundPageMetadata contract", () => {
  assert.deepEqual(notFoundPageMetadata.robots, {
    index: false,
    follow: false,
  });
});

test("invalid occasion slug metadata helper stays noindex", () => {
  const metadata = resolveOccasionPageMetadata("invalid-occ", categories, []);
  assert.deepEqual(metadata.robots, { index: false, follow: true });
});

test("product UUID route param is recognized for legacy redirect path", () => {
  assert.equal(isUuid("f47ac10b-58cc-4372-a567-0e02b2c3d479"), true);
  assert.equal(isUuid("invalid-slug-xyz"), false);
});

test("categories hub exports page-level Open Graph", () => {
  assert.equal(categoriesHubMetadata.openGraph?.url, "/categorii");
  assert.equal(categoriesHubMetadata.openGraph?.title, "Категории");
  assert.equal(categoriesHubMetadata.alternates?.canonical, "/categorii");
});
