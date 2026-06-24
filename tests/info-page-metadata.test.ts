import assert from "node:assert/strict";
import test from "node:test";

import { siteMediaDefaults } from "@/lib/content/site-media-defaults";
import { resolveSiteMedia } from "@/lib/content/site-media";
import type { SiteMediaRow } from "@/lib/content/site-media-types";
import {
  buildInfoPageMetadata,
  COOKIES_PAGE_METADATA,
  DELIVERY_PAGE_METADATA,
  KONTAKTI_PAGE_METADATA,
  PRIVACY_PAGE_METADATA,
  RETURNS_PAGE_METADATA,
  TERMS_PAGE_METADATA,
} from "@/lib/seo/info-page-metadata";
import {
  firstOpenGraphImage,
  twitterImages,
} from "@/tests/metadata-test-helpers";

const uploadedHomeHeroUrl =
  "https://example.supabase.co/storage/v1/object/public/product-images/site-content/home-hero.webp";

const infoPages = [
  { name: "kontakti", config: KONTAKTI_PAGE_METADATA },
  { name: "delivery", config: DELIVERY_PAGE_METADATA },
  { name: "returns", config: RETURNS_PAGE_METADATA },
  { name: "terms", config: TERMS_PAGE_METADATA },
  { name: "privacy", config: PRIVACY_PAGE_METADATA },
  { name: "cookies", config: COOKIES_PAGE_METADATA },
] as const;

function homeHeroRow(imageUrl: string | null, imageAlt: string | null): SiteMediaRow {
  return {
    key: "home.hero",
    label: "home.hero",
    section: "home",
    sort_order: 0,
    image_url: imageUrl,
    image_alt: imageAlt,
    updated_at: "2026-01-01T00:00:00.000Z",
  };
}

for (const page of infoPages) {
  test(`${page.name} keeps title, description and canonical`, () => {
    const metadata = buildInfoPageMetadata(page.config);

    assert.equal(metadata.title, page.config.title);
    assert.equal(metadata.description, page.config.description);
    assert.equal(metadata.alternates?.canonical, page.config.canonicalPath);
    assert.equal((metadata.openGraph as { type?: string })?.type, "website");
    assert.equal(metadata.openGraph?.title, page.config.title);
    assert.equal(metadata.openGraph?.description, page.config.description);
    assert.equal(metadata.openGraph?.url, page.config.canonicalPath);
    assert.equal(
      (metadata.twitter as { card?: string })?.card,
      "summary_large_image",
    );
    assert.equal(metadata.twitter?.title, page.config.title);
    assert.equal(metadata.twitter?.description, page.config.description);
    assert.equal(metadata.robots, undefined);
  });
}

test("info pages use uploaded home.hero for Open Graph and Twitter", () => {
  const hero = resolveSiteMedia(
    "home.hero",
    homeHeroRow(uploadedHomeHeroUrl, "Качен home hero"),
  );
  const metadata = buildInfoPageMetadata(KONTAKTI_PAGE_METADATA, {
    src: hero.src,
    alt: hero.alt,
  });

  assert.equal(firstOpenGraphImage(metadata)?.url, uploadedHomeHeroUrl);
  assert.equal(firstOpenGraphImage(metadata)?.alt, "Качен home hero");
  assert.deepEqual(twitterImages(metadata), [uploadedHomeHeroUrl]);
});

test("info pages fall back to static home.hero when upload is missing", () => {
  const hero = resolveSiteMedia("home.hero");
  const metadata = buildInfoPageMetadata(DELIVERY_PAGE_METADATA, {
    src: hero.src,
    alt: hero.alt,
  });

  assert.equal(
    firstOpenGraphImage(metadata)?.url,
    siteMediaDefaults["home.hero"].src,
  );
  assert.equal(
    firstOpenGraphImage(metadata)?.alt,
    siteMediaDefaults["home.hero"].alt,
  );
  assert.deepEqual(twitterImages(metadata), [siteMediaDefaults["home.hero"].src]);
});

test("info pages without social image omit Open Graph and Twitter images", () => {
  const metadata = buildInfoPageMetadata(TERMS_PAGE_METADATA);

  assert.equal(metadata.openGraph?.images, undefined);
  assert.equal(metadata.twitter?.images, undefined);
});
