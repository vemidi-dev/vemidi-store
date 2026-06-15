import assert from "node:assert/strict";
import test from "node:test";

import { buildIndexableMetadata } from "@/lib/seo/faceted-metadata";
import { buildShopMetadata } from "@/lib/seo/shop-route";
import { buildBlogMetadata } from "@/lib/seo/blog-route";
import { notFoundPageMetadata } from "@/lib/seo/page-metadata";
import type { StorefrontCategory } from "@/lib/storefront/types";

const categories: StorefrontCategory[] = [
  {
    id: "cat-1",
    name: "Кутии",
    slug: "kutii",
    category_type: "product",
    parent_id: null,
    show_on_home: true,
    home_sort_order: 1,
    card_description: null,
    createdAt: null,
  },
];

test("indexable hub metadata includes page-level Open Graph", () => {
  const metadata = buildIndexableMetadata("/shop", {
    title: "Продукти",
    description: "Shop description",
  });

  assert.equal(metadata.openGraph?.url, "/shop");
  assert.equal(metadata.openGraph?.title, "Продукти");
});

test("bare shop metadata exposes hub Open Graph url", () => {
  const metadata = buildShopMetadata({}, categories);
  assert.equal(metadata.openGraph?.url, "/shop");
  assert.equal(metadata.openGraph?.title, "Продукти");
  assert.equal(metadata.twitter?.title, "Продукти");
});

test("bare blog metadata exposes hub Open Graph url", () => {
  const metadata = buildBlogMetadata({});
  assert.equal(metadata.openGraph?.url, "/blog");
  assert.equal(metadata.openGraph?.title, "Блог");
});

test("not-found metadata remains noindex nofollow for soft-404 regression", () => {
  assert.deepEqual(notFoundPageMetadata.robots, {
    index: false,
    follow: false,
  });
});
