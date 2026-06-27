import assert from "node:assert/strict";
import test from "node:test";

import sharp from "sharp";

import { EVENT_GALLERY_SCOPE_ID } from "@/lib/images/constants";
import { getImageProfile, getMaxInputPixels, IMAGE_PROFILES, PRODUCT_MAX_INPUT_PIXELS } from "@/lib/images/profiles";
import { processImageBuffer, validateImageInputSize } from "@/lib/images/process-image";
import { buildImageStoragePath } from "@/lib/images/storage-path";
import {
  processAndUploadImages,
  validateImageUploadBatch,
  type ImageStorageAdapter,
} from "@/lib/images/upload-image";

const PRODUCT_ID = "11111111-1111-4111-8111-111111111111";
const POST_ID = "22222222-2222-4222-8222-222222222222";
const CATEGORY_ID = "33333333-3333-4333-8333-333333333333";

async function createImage(width: number, height: number) {
  return sharp({
    create: { width, height, channels: 3, background: { r: 100, g: 80, b: 60 } },
  })
    .jpeg()
    .toBuffer();
}

test("image profiles expose distinct optimization settings", () => {
  assert.equal(IMAGE_PROFILES.product.maxDimension, 1800);
  assert.equal(IMAGE_PROFILES.product.quality, 84);
  assert.equal(IMAGE_PROFILES.event_gallery.maxDimension, 1400);
  assert.equal(IMAGE_PROFILES.event_gallery.quality, 77);
  assert.equal(IMAGE_PROFILES.category.quality, 80);
  assert.equal(IMAGE_PROFILES.blog.maxDimension, 1600);
  assert.equal(IMAGE_PROFILES.hero.maxDimension, 2000);
});

test("product profile rejects files above 10 MB", () => {
  const profile = getImageProfile("product");
  assert.equal(profile.maxFileSize, 10 * 1024 * 1024);
  assert.throws(
    () => validateImageInputSize(profile.maxFileSize + 1, "product"),
    /надвишава/,
  );
});

test("product profile allows high-resolution phone photos up to 24 MP input", () => {
  assert.equal(IMAGE_PROFILES.product.maxInputPixels, PRODUCT_MAX_INPUT_PIXELS);
  assert.equal(getMaxInputPixels("product"), 24_000_000);
  assert.equal(IMAGE_PROFILES.product.maxDimension, 1800);
});

test("product profile processes 4032x3659 JPEG without pixel limit failure", async () => {
  const input = await createImage(4032, 3659);
  const result = await processImageBuffer(input, input.length, "product", {}, "ramka-s-muh.jpg");

  assert.equal(result.profileId, "product");
  assert.equal(Math.max(result.width, result.height), 1800);
  assert.ok(result.optimizedSize > 0);
});

test("product profile rejects absurd input resolution above 24 MP", async () => {
  const input = await createImage(6000, 6000);

  await assert.rejects(
    () => processImageBuffer(input, input.length, "product", {}, "huge.jpg"),
    /твърде голяма резолюция/,
  );
});

test("event_gallery profile limits gallery to 30 images", () => {
  const files = [new File([new Uint8Array([1])], "a.jpg", { type: "image/jpeg" })];
  assert.equal(validateImageUploadBatch("event_gallery", files, 29), null);
  assert.match(
    validateImageUploadBatch("event_gallery", files, 30) ?? "",
    /лимит/i,
  );
});

test("each profile builds a safe scoped storage path", () => {
  const imageId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

  assert.equal(
    buildImageStoragePath("product", PRODUCT_ID, imageId),
    `products/${PRODUCT_ID}/${imageId}.webp`,
  );
  assert.equal(
    buildImageStoragePath("event_gallery", EVENT_GALLERY_SCOPE_ID, imageId),
    `events/${EVENT_GALLERY_SCOPE_ID}/${imageId}.webp`,
  );
  assert.equal(
    buildImageStoragePath("category", CATEGORY_ID, imageId),
    `categories/${CATEGORY_ID}/${imageId}.webp`,
  );
  assert.equal(
    buildImageStoragePath("blog", POST_ID, imageId),
    `blog/${POST_ID}/${imageId}.webp`,
  );
  assert.equal(
    buildImageStoragePath("hero", "ignored", imageId),
    `site-content/${imageId}.webp`,
  );
});

const profileCases = [
  ["product", 2000, 1800],
  ["event_gallery", 1800, 1400],
  ["category", 1800, 1400],
  ["blog", 1900, 1600],
  ["hero", 2400, 2000],
] as const;

for (const [profileId, inputWidth, expectedMax] of profileCases) {
  test(`${profileId} profile resizes to its max dimension`, async () => {
    const input = await createImage(inputWidth, 1000);
    const result = await processImageBuffer(input, input.length, profileId);
    assert.equal(result.profileId, profileId);
    assert.equal(Math.max(result.width, result.height), expectedMax);
  });
}

test("event_gallery upload flow uses event_gallery profile paths", async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://example.supabase.co";

  const files = new Map<string, Buffer>();
  const adapter: ImageStorageAdapter = {
    async upload(path, body) {
      files.set(path, Buffer.from(body));
      return { error: null };
    },
    async remove(paths) {
      paths.forEach((path) => files.delete(path));
      return { error: null };
    },
    async list() {
      return { paths: [], error: null };
    },
  };

  const input = await createImage(1600, 1200);
  const file = new File([new Uint8Array(input)], "event.jpg", { type: "image/jpeg" });
  const uploaded = await processAndUploadImages(
    {} as never,
    "event_gallery",
    EVENT_GALLERY_SCOPE_ID,
    [file],
    0,
    { storageAdapter: adapter },
  );

  assert.equal(uploaded[0]?.profileId, "event_gallery");
  assert.match(uploaded[0]?.path ?? "", /^events\/gallery\/[0-9a-f-]+\.webp$/);
});

test("product upload validation uses product profile limits", () => {
  const files = Array.from({ length: 13 }, (_, index) =>
    new File([new Uint8Array([index])], `file-${index}.jpg`, { type: "image/jpeg" }),
  );

  assert.match(validateImageUploadBatch("product", files, 0) ?? "", /12/i);
  assert.equal(validateImageUploadBatch("event_gallery", files.slice(0, 12), 0), null);
});
