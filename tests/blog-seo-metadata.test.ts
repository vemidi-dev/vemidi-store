import assert from "node:assert/strict";
import test from "node:test";

import { buildBlogMetadata, isBlogFaceted } from "@/lib/seo/blog-route";

test("bare blog params are indexable with canonical /blog", () => {
  const metadata = buildBlogMetadata({});
  assert.equal(metadata.alternates?.canonical, "/blog");
  assert.deepEqual(metadata.robots, { index: true, follow: true });
});

test("blog search query is noindex with canonical /blog", () => {
  const metadata = buildBlogMetadata({ q: "подарък" });
  assert.equal(metadata.alternates?.canonical, "/blog");
  assert.deepEqual(metadata.robots, { index: false, follow: true });
});

test("empty blog query params are noindex", () => {
  for (const params of [{ q: "" }, { category: "" }, { sort: "" }] as const) {
    assert.equal(isBlogFaceted(params), true, JSON.stringify(params));
    const metadata = buildBlogMetadata(params);
    assert.equal(metadata.alternates?.canonical, "/blog");
    assert.deepEqual(metadata.robots, { index: false, follow: true });
  }
});

test("blog category filter is noindex", () => {
  assert.equal(isBlogFaceted({ category: "идеи" }), true);
});

test("blog sort filter is noindex", () => {
  assert.equal(isBlogFaceted({ sort: "popular" }), true);
});

test("unknown blog params are noindex", () => {
  assert.equal(isBlogFaceted({ utm_source: "newsletter" }), true);
});
