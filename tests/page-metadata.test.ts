import assert from "node:assert/strict";
import test from "node:test";

import { siteConfig } from "@/config/site";
import {
  buildHomePageMetadata,
  notFoundPageMetadata,
} from "@/lib/seo/page-metadata";

test("homepage metadata uses siteConfig without layout duplication", () => {
  const metadata = buildHomePageMetadata();
  const expectedTitle = `${siteConfig.name} | Персонализирани подаръци`;

  assert.deepEqual(metadata.title, { absolute: expectedTitle });
  assert.equal(metadata.description, siteConfig.description);
  assert.equal(metadata.alternates?.canonical, "/");
  assert.equal(metadata.openGraph?.title, expectedTitle);
  assert.equal(metadata.openGraph?.url, "/");
  assert.equal(metadata.twitter?.title, expectedTitle);
});

test("not-found metadata is noindex and nofollow", () => {
  assert.equal(notFoundPageMetadata.title, "Страницата не е намерена");
  assert.deepEqual(notFoundPageMetadata.robots, {
    index: false,
    follow: false,
  });
});
