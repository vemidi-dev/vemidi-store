import assert from "node:assert/strict";
import test from "node:test";

import sharp from "sharp";

import {
  areDistinctProductImagePaths,
  buildImportedGalleryPayload,
  normalizeSourceGalleryImages,
  type CopiedGalleryPair,
} from "@/lib/admin/copy-product-gallery";
import {
  buildDuplicateSuccessMessage,
  DUPLICATE_COPY_IMAGES_FIELD,
  shouldCopyDuplicateImages,
} from "@/lib/admin/duplicate-product";
import { optimizeProductImageBuffer } from "@/lib/admin/product-image-optimize";
import {
  deleteStoragePathsBestEffort,
  type ProductImageStorageAdapter,
  uploadOptimizedProductImage,
} from "@/lib/admin/product-image-storage";
import { validateProductImageUploadBatch } from "@/lib/admin/product-image-upload";

const SOURCE_PRODUCT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const TARGET_PRODUCT_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

test("duplicate copy images checkbox is unchecked by default", () => {
  const formData = new FormData();
  formData.set("id", SOURCE_PRODUCT_ID);

  assert.equal(shouldCopyDuplicateImages(formData), false);
});

test("duplicate copy images checkbox is enabled only when explicitly submitted", () => {
  const formData = new FormData();
  formData.set(DUPLICATE_COPY_IMAGES_FIELD, "true");

  assert.equal(shouldCopyDuplicateImages(formData), true);
});

test("duplicate success message prompts for images when copy is not requested", () => {
  assert.match(
    buildDuplicateSuccessMessage(null, { copyImagesRequested: false }),
    /Добавете снимки/i,
  );
});

test("normalizeSourceGalleryImages keeps gallery order and legacy fallback", () => {
  const normalized = normalizeSourceGalleryImages(
    [
      {
        image_url: "https://example.com/second.webp",
        alt_text: "Втора",
        is_primary: false,
        sort_order: 20,
      },
      {
        image_url: "https://example.com/primary.webp",
        alt_text: "Основна",
        is_primary: true,
        sort_order: 10,
      },
    ],
    null,
    "Продукт",
  );

  assert.equal(normalized[0]?.image_url, "https://example.com/primary.webp");
  assert.equal(normalized[1]?.image_url, "https://example.com/second.webp");
  assert.equal(
    normalizeSourceGalleryImages([], "https://example.com/legacy.jpg", "Продукт")[0]
      ?.image_url,
    "https://example.com/legacy.jpg",
  );
});

test("import payload preserves alt text, order and primary flag", () => {
  const pairs: CopiedGalleryPair[] = [
    {
      source: {
        image_url: "https://example.com/a.jpg",
        alt_text: "Първа",
        is_primary: false,
        sort_order: 10,
      },
      uploaded: {
        path: `products/${TARGET_PRODUCT_ID}/11111111-1111-4111-8111-111111111111.webp`,
        url: "https://example.com/storage/a.webp",
        imageId: "11111111-1111-4111-8111-111111111111",
        originalSize: 1000,
        optimizedSize: 500,
      },
    },
    {
      source: {
        image_url: "https://example.com/b.jpg",
        alt_text: "Основна",
        is_primary: true,
        sort_order: 0,
      },
      uploaded: {
        path: `products/${TARGET_PRODUCT_ID}/22222222-2222-4222-8222-222222222222.webp`,
        url: "https://example.com/storage/b.webp",
        imageId: "22222222-2222-4222-8222-222222222222",
        originalSize: 1000,
        optimizedSize: 500,
      },
    },
  ];

  assert.deepEqual(buildImportedGalleryPayload(pairs, "Продукт"), [
    {
      image_url: "https://example.com/storage/a.webp",
      alt_text: "Първа",
      sort_order: 10,
      is_primary: false,
    },
    {
      image_url: "https://example.com/storage/b.webp",
      alt_text: "Основна",
      sort_order: 0,
      is_primary: true,
    },
  ]);
});

test("copied gallery files use distinct scoped storage paths", async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://example.supabase.co";

  const sourceUrl =
    "https://example.supabase.co/storage/v1/object/public/product-images/products/legacy-source.webp";
  const input = await sharp({
    create: { width: 900, height: 900, channels: 3, background: "white" },
  })
    .jpeg()
    .toBuffer();
  const optimized = await optimizeProductImageBuffer(input, input.length);

  const files = new Map<string, Buffer>();
  const adapter: ProductImageStorageAdapter = {
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

  const copied = await uploadOptimizedProductImage(adapter, TARGET_PRODUCT_ID, optimized);

  assert.equal(areDistinctProductImagePaths(sourceUrl, copied, TARGET_PRODUCT_ID), true);
  assert.match(copied.path, new RegExp(`^products/${TARGET_PRODUCT_ID}/`));
});

test("adding images validates against existing gallery count without replacing it", async () => {
  const files = [
    new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], "new.jpg", { type: "image/jpeg" }),
  ];

  assert.equal(await validateProductImageUploadBatch(files, 11), null);
  assert.match(
    (await validateProductImageUploadBatch(files, 12)) ?? "",
    /лимит.*12/i,
  );
});

test("replace upload rollback removes only the new file on failed record update", async () => {
  const files = new Map<string, Buffer>();
  const adapter: ProductImageStorageAdapter = {
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

  const oldPath = `products/${TARGET_PRODUCT_ID}/old-image.webp`;
  files.set(oldPath, Buffer.from("old"));

  const input = await sharp({
    create: { width: 900, height: 900, channels: 3, background: "white" },
  })
    .jpeg()
    .toBuffer();
  const optimized = await optimizeProductImageBuffer(input, input.length);
  const uploaded = await uploadOptimizedProductImage(adapter, TARGET_PRODUCT_ID, optimized);

  const cleanup = await deleteStoragePathsBestEffort(adapter, [uploaded.path]);

  assert.equal(cleanup.failedPaths.length, 0);
  assert.equal(files.has(oldPath), true);
  assert.equal(files.has(uploaded.path), false);
});
