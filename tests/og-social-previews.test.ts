import assert from "node:assert/strict";
import test from "node:test";

import { buildCategoryPageMetadata } from "@/lib/seo/category-metadata";
import { buildOccasionPageMetadata } from "@/lib/seo/occasion-metadata";
import { buildInfoPageMetadata, KONTAKTI_PAGE_METADATA } from "@/lib/seo/info-page-metadata";
import { buildIndexableMetadata } from "@/lib/seo/faceted-metadata";
import { buildBlogMetadata } from "@/lib/seo/blog-route";
import { buildProductPageMetadata } from "@/lib/seo/product-metadata";
import {
  firstOpenGraphImage,
  twitterImages,
} from "@/tests/metadata-test-helpers";
import type { StorefrontCategory } from "@/lib/storefront/types";
import type { Product } from "@/lib/catalog";

const category: StorefrontCategory = {
  id: "cat-1",
  name: "Кутии",
  slug: "kutii",
  category_type: "product",
  parent_id: null,
  show_on_home: true,
  home_sort_order: 1,
  card_description: "Ръчно изработени кутии.",
  createdAt: "2026-01-01T00:00:00.000Z",
  cover_image_url: "https://example.com/kutii-hero.jpg",
};

const occasion: StorefrontCategory = {
  id: "occ-1",
  name: "Рожден ден",
  slug: "rojden-den",
  category_type: "occasion",
  parent_id: null,
  show_on_home: true,
  home_sort_order: 1,
  card_description: "Подаръци за рожден ден.",
  createdAt: "2026-01-01T00:00:00.000Z",
  cover_image_url: "https://example.com/rojden-den-hero.jpg",
};

test("category metadata includes locale and siteName", () => {
  const metadata = buildCategoryPageMetadata({
    category,
    categories: [category],
    productCategorySlugs: [["kutii"]],
    parent: null,
  });

  assert.equal(metadata.openGraph?.locale, "bg_BG");
  assert.equal(metadata.openGraph?.siteName, "VeMiDi crafts");
  assert.equal((metadata.openGraph as Record<string, unknown>)?.type, "website");
});

test("category metadata uses hero image as OG image with alt", () => {
  const metadata = buildCategoryPageMetadata({
    category,
    categories: [category],
    productCategorySlugs: [["kutii"]],
    parent: null,
  });

  const ogImage = firstOpenGraphImage(metadata);
  assert.ok(ogImage, "expected og:image");
  assert.ok(ogImage.url, "expected og:image url");
  assert.ok(ogImage.alt, "expected og:image alt");
  assert.ok(twitterImages(metadata)?.length, "expected twitter image");
});

test("occasion metadata includes locale and siteName", () => {
  const metadata = buildOccasionPageMetadata({
    occasion,
    categories: [occasion],
    productCategorySlugs: [["rojden-den"]],
  });

  assert.equal(metadata.openGraph?.locale, "bg_BG");
  assert.equal(metadata.openGraph?.siteName, "VeMiDi crafts");
  assert.equal((metadata.openGraph as Record<string, unknown>)?.type, "website");
});

test("info page metadata includes locale and siteName", () => {
  const metadata = buildInfoPageMetadata(KONTAKTI_PAGE_METADATA);

  assert.equal(metadata.openGraph?.locale, "bg_BG");
  assert.equal(metadata.openGraph?.siteName, "VeMiDi crafts");
});

test("faceted indexable metadata includes locale and siteName", () => {
  const metadata = buildIndexableMetadata("/blog", {
    title: "Блог",
    description: "Блог описание",
  });

  assert.equal(metadata.openGraph?.locale, "bg_BG");
  assert.equal(metadata.openGraph?.siteName, "VeMiDi crafts");
});

test("blog index canonical passes social image through", () => {
  const metadata = buildBlogMetadata({}, {
    src: "https://example.com/blog-hero.jpg",
    alt: "Blog hero",
  });

  const ogImage = firstOpenGraphImage(metadata);
  assert.ok(ogImage, "expected og:image on blog canonical");
  assert.equal(ogImage.url, "https://example.com/blog-hero.jpg");
});

test("blog index faceted does not include social image", () => {
  const metadata = buildBlogMetadata({ q: "test" }, {
    src: "https://example.com/blog-hero.jpg",
    alt: "Blog hero",
  });

  const ogImage = firstOpenGraphImage(metadata);
  assert.equal(ogImage, undefined);
});

test("product metadata uses primary image as OG image with alt", () => {
  const product = {
    id: "p-1",
    title: "Кутия за бижута",
    slug: "kutiya-za-bijuta",
    images: [{ src: "https://example.com/product.jpg" }],
    orderable: true,
    fulfillmentType: "stocked",
    soldOut: false,
  } as unknown as Product;

  const metadata = buildProductPageMetadata(product, "kutiya-za-bijuta");
  const ogImage = firstOpenGraphImage(metadata);
  assert.ok(ogImage, "expected og:image");
  assert.equal(ogImage.url, "https://example.com/product.jpg");
  assert.ok(ogImage.alt, "expected alt text from product title");
  assert.equal(metadata.openGraph?.locale, "bg_BG");
  assert.equal(metadata.openGraph?.siteName, "VeMiDi crafts");
});

test("product without images has no OG image but still has locale", () => {
  const product = {
    id: "p-2",
    title: "Дървен магнит",
    slug: "durven-magnit",
    images: [],
    orderable: true,
    fulfillmentType: "stocked",
    soldOut: false,
  } as unknown as Product;

  const metadata = buildProductPageMetadata(product, "durven-magnit");
  assert.equal(firstOpenGraphImage(metadata), undefined);
  assert.equal(metadata.openGraph?.locale, "bg_BG");
  assert.equal((metadata.twitter as Record<string, unknown>)?.card, "summary");
});
