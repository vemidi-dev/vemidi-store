import assert from "node:assert/strict";
import test from "node:test";

import { siteMediaDefaults } from "@/lib/content/site-media-defaults";
import {
  resolveSiteMedia,
  resolveSiteMediaFromMap,
} from "@/lib/content/site-media";
import {
  SITE_MEDIA_KEYS,
  type SiteMediaKey,
  type SiteMediaRow,
} from "@/lib/content/site-media-types";

function mediaRow(
  key: SiteMediaKey,
  overrides: Partial<SiteMediaRow> = {},
): SiteMediaRow {
  return {
    key,
    label: key,
    section: "test",
    sort_order: 0,
    image_url: null,
    image_alt: null,
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

test("resolveSiteMedia falls back for all Phase 1 keys", () => {
  for (const key of SITE_MEDIA_KEYS) {
    const resolved = resolveSiteMedia(key);
    const defaults = siteMediaDefaults[key];

    assert.equal(resolved.src, defaults.src);
    assert.equal(resolved.alt, defaults.alt);
    assert.equal(resolved.source, "fallback");
  }
});

test("resolveSiteMedia prefers uploaded image_url", () => {
  const uploadedUrl = "https://example.supabase.co/storage/v1/object/public/product-images/site-content/abc.webp";

  const resolved = resolveSiteMedia(
    "shop.hero",
    mediaRow("shop.hero", { image_url: uploadedUrl }),
  );

  assert.equal(resolved.src, uploadedUrl);
  assert.equal(resolved.source, "uploaded");
});

test("resolveSiteMedia uses default alt when uploaded image has no alt", () => {
  const uploadedUrl = "https://example.supabase.co/storage/v1/object/public/product-images/site-content/abc.webp";

  const resolved = resolveSiteMedia(
    "home.hero",
    mediaRow("home.hero", { image_url: uploadedUrl, image_alt: null }),
  );

  assert.equal(resolved.alt, siteMediaDefaults["home.hero"].alt);
  assert.equal(resolved.source, "uploaded");
});

test("resolveSiteMedia uses custom alt when provided", () => {
  const uploadedUrl = "https://example.supabase.co/storage/v1/object/public/product-images/site-content/abc.webp";
  const customAlt = "Персонализирана hero снимка";

  const resolved = resolveSiteMedia(
    "home.hero",
    mediaRow("home.hero", {
      image_url: uploadedUrl,
      image_alt: customAlt,
    }),
  );

  assert.equal(resolved.alt, customAlt);
  assert.equal(resolved.source, "uploaded");
});

test("resolveSiteMediaFromMap falls back when row is missing", () => {
  const map = Object.fromEntries(
    SITE_MEDIA_KEYS.map((key) => [key, null]),
  ) as Record<SiteMediaKey, SiteMediaRow | null>;

  const resolved = resolveSiteMediaFromMap(map, "blog.hero");

  assert.equal(resolved.src, siteMediaDefaults["blog.hero"].src);
  assert.equal(resolved.alt, siteMediaDefaults["blog.hero"].alt);
  assert.equal(resolved.source, "fallback");
});

test("resolveSiteMediaFromMap resolves uploaded row from map", () => {
  const uploadedUrl = "https://example.supabase.co/storage/v1/object/public/product-images/site-content/events.webp";
  const map = Object.fromEntries(
    SITE_MEDIA_KEYS.map((key) => [key, null]),
  ) as Record<SiteMediaKey, SiteMediaRow | null>;

  map["events.hero"] = mediaRow("events.hero", { image_url: uploadedUrl });

  const resolved = resolveSiteMediaFromMap(map, "events.hero");

  assert.equal(resolved.src, uploadedUrl);
  assert.equal(resolved.source, "uploaded");
});
