import assert from "node:assert/strict";
import test from "node:test";

import { siteMediaDefaults } from "@/lib/content/site-media-defaults";
import { resolveSiteMedia } from "@/lib/content/site-media";
import type { SiteMediaRow } from "@/lib/content/site-media-types";
import {
  buildAboutPageMetadata,
  buildHomePageMetadata,
} from "@/lib/seo/page-metadata";
import { buildShopMetadata } from "@/lib/seo/shop-route";
import type { StorefrontCategory } from "@/lib/storefront/types";
import {
  firstOpenGraphImage,
  twitterImages,
} from "@/tests/metadata-test-helpers";

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

const uploadedUrl =
  "https://example.supabase.co/storage/v1/object/public/product-images/site-content/about.webp";

function mediaRow(
  key: "home.hero" | "shop.hero" | "about.hero",
  imageUrl: string | null,
): SiteMediaRow {
  return {
    key,
    label: key,
    section: "test",
    sort_order: 0,
    image_url: imageUrl,
    image_alt: "Качено изображение",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
}

test("home.hero fallback image is included in Open Graph and Twitter", () => {
  const hero = resolveSiteMedia("home.hero");
  const metadata = buildHomePageMetadata({ src: hero.src, alt: hero.alt });

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

test("home.hero uploaded URL takes priority over static fallback", () => {
  const hero = resolveSiteMedia("home.hero", mediaRow("home.hero", uploadedUrl));
  const metadata = buildHomePageMetadata({ src: hero.src, alt: hero.alt });

  assert.equal(firstOpenGraphImage(metadata)?.url, uploadedUrl);
  assert.equal(firstOpenGraphImage(metadata)?.alt, "Качено изображение");
  assert.deepEqual(twitterImages(metadata), [uploadedUrl]);
});

test("shop.hero is included in bare /produkti metadata only", () => {
  const hero = resolveSiteMedia("shop.hero");
  const metadata = buildShopMetadata({}, categories, {
    src: hero.src,
    alt: hero.alt,
  });

  assert.equal(metadata.alternates?.canonical, "/produkti");
  assert.deepEqual(metadata.robots, { index: true, follow: true });
  assert.equal(
    firstOpenGraphImage(metadata)?.url,
    siteMediaDefaults["shop.hero"].src,
  );
  assert.deepEqual(twitterImages(metadata), [siteMediaDefaults["shop.hero"].src]);
});

test("faceted /produkti stays noindex with canonical /produkti and no social images", () => {
  const hero = resolveSiteMedia("shop.hero");
  const metadata = buildShopMetadata({ q: "подарък" }, categories, {
    src: hero.src,
    alt: hero.alt,
  });

  assert.equal(metadata.alternates?.canonical, "/produkti");
  assert.deepEqual(metadata.robots, { index: false, follow: true });
  assert.equal(metadata.openGraph?.images, undefined);
  assert.equal(metadata.twitter?.images, undefined);
});

test("about.hero fallback image is included in Open Graph and Twitter", () => {
  const hero = resolveSiteMedia("about.hero");
  const metadata = buildAboutPageMetadata({ src: hero.src, alt: hero.alt });

  assert.equal(metadata.title, "За нас");
  assert.equal(metadata.alternates?.canonical, "/za-nas");
  assert.equal(metadata.openGraph?.url, "/za-nas");
  assert.equal(
    firstOpenGraphImage(metadata)?.url,
    siteMediaDefaults["about.hero"].src,
  );
  assert.deepEqual(twitterImages(metadata), [siteMediaDefaults["about.hero"].src]);
});

test("about.hero uploaded URL takes priority over static fallback", () => {
  const hero = resolveSiteMedia("about.hero", mediaRow("about.hero", uploadedUrl));
  const metadata = buildAboutPageMetadata({ src: hero.src, alt: hero.alt });

  assert.equal(firstOpenGraphImage(metadata)?.url, uploadedUrl);
  assert.deepEqual(twitterImages(metadata), [uploadedUrl]);
});
