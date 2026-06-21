import assert from "node:assert/strict";
import test from "node:test";

import sharp from "sharp";

import {
  buildProductImageStoragePath,
  getProductStoragePrefix,
  isPathWithinProductScope,
} from "@/lib/admin/product-image-path";
import { optimizeProductImageBuffer } from "@/lib/admin/product-image-optimize";
import {
  deleteProductScopedStoragePaths,
  deleteStoragePathsBestEffort,
  type ProductImageStorageAdapter,
  uploadOptimizedProductImage,
} from "@/lib/admin/product-image-storage";
import {
  processAndUploadProductImages,
  validateProductImageUploadBatch,
} from "@/lib/admin/product-image-upload";
import { getProductImagePath } from "@/lib/admin/storage";

process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://example.supabase.co";

const PRODUCT_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_PRODUCT_ID = "22222222-2222-4222-8222-222222222222";

function createFakeStorageAdapter() {
  const files = new Map<string, Buffer>();

  const adapter: ProductImageStorageAdapter = {
    async upload(path, body) {
      if (files.has(path)) {
        return { error: new Error("already exists") };
      }
      files.set(path, Buffer.from(body));
      return { error: null };
    },
    async remove(paths) {
      for (const path of paths) {
        files.delete(path);
      }
      return { error: null };
    },
    async list(prefix) {
      const paths = [...files.keys()].filter((path) => path.startsWith(`${prefix}/`));
      return { paths, error: null };
    },
  };

  return { adapter, files };
}

test("storage path uses product and image UUIDs and blocks traversal", () => {
  const imageId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const path = buildProductImageStoragePath(PRODUCT_ID, imageId);

  assert.equal(path, `products/${PRODUCT_ID}/${imageId}.webp`);
  assert.throws(
    () => buildProductImageStoragePath("../evil", imageId),
    /Невалиден/,
  );
  assert.throws(
    () => buildProductImageStoragePath(PRODUCT_ID, "../../etc/passwd"),
    /Невалиден/,
  );
});

test("upload stores optimized WebP under scoped path", async () => {
  const { adapter } = createFakeStorageAdapter();
  const input = await sharp({
    create: { width: 900, height: 900, channels: 3, background: "white" },
  })
    .jpeg()
    .toBuffer();
  const optimized = await optimizeProductImageBuffer(input, input.length);
  const uploaded = await uploadOptimizedProductImage(adapter, PRODUCT_ID, optimized);

  assert.match(uploaded.path, new RegExp(`^products/${PRODUCT_ID}/[0-9a-f-]+\\.webp$`));
  assert.match(uploaded.url, /storage\/v1\/object\/public\/product-images\//);
});

test("batch validation enforces max 12 images per product", async () => {
  const files = Array.from(
    { length: 3 },
    (_, index) => new File([new Uint8Array([0xff, 0xd8, 0xff, index + 1])], `file-${index}.jpg`, { type: "image/jpeg" }),
  );

  assert.equal(await validateProductImageUploadBatch([files[0]], 11), null);
  assert.match(
    (await validateProductImageUploadBatch(files, 10)) ?? "",
    /лимит.*12/i,
  );
});

test("failed gallery attach cleanup removes only uploaded files from current operation", async () => {
  const { adapter, files } = createFakeStorageAdapter();
  const existingPath = buildProductImageStoragePath(
    PRODUCT_ID,
    "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  );
  files.set(existingPath, Buffer.from("existing"));

  const input = await sharp({
    create: { width: 900, height: 900, channels: 3, background: "white" },
  })
    .jpeg()
    .toBuffer();

  const optimized = await optimizeProductImageBuffer(input, input.length);
  const uploaded = await uploadOptimizedProductImage(adapter, PRODUCT_ID, optimized);

  const cleanup = await deleteStoragePathsBestEffort(adapter, [uploaded.path]);
  assert.equal(cleanup.failedPaths.length, 0);
  assert.equal(files.has(existingPath), true);
  assert.equal(files.has(uploaded.path), false);
});

test("deleteProductScopedStoragePaths removes only the target product folder", async () => {
  const { adapter, files } = createFakeStorageAdapter();
  const ownPath = buildProductImageStoragePath(
    PRODUCT_ID,
    "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  );
  const otherPath = buildProductImageStoragePath(
    OTHER_PRODUCT_ID,
    "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  );
  const legacyPath = "products/legacy-timestamp.jpg";

  files.set(ownPath, Buffer.from("own"));
  files.set(otherPath, Buffer.from("other"));
  files.set(legacyPath, Buffer.from("legacy"));

  const cleanup = await deleteProductScopedStoragePaths(adapter, PRODUCT_ID, [legacyPath]);

  assert.equal(cleanup.failedPaths.length, 0);
  assert.equal(files.has(ownPath), false);
  assert.equal(files.has(legacyPath), false);
  assert.equal(files.has(otherPath), true);
});

test("legacy public URLs remain compatible with path extraction", () => {
  const legacyUrl =
    "https://example.supabase.co/storage/v1/object/public/product-images/products/1700000000-abc.jpg";
  const modernUrl =
    "https://example.supabase.co/storage/v1/object/public/product-images/products/11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.webp";

  assert.equal(getProductImagePath(legacyUrl), "products/1700000000-abc.jpg");
  assert.equal(
    getProductImagePath(modernUrl),
    "products/11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.webp",
  );
});

test("processAndUploadProductImages rolls back partial uploads on failure", async () => {
  let uploadCount = 0;
  const { adapter, files } = createFakeStorageAdapter();
  const wrappedAdapter: ProductImageStorageAdapter = {
    ...adapter,
    async upload(path, body, options) {
      uploadCount += 1;
      if (uploadCount === 2) {
        return { error: new Error("upload failed") };
      }
      return adapter.upload(path, body, options);
    },
  };

  const fileABuffer = await sharp({
    create: { width: 900, height: 900, channels: 3, background: "white" },
  })
    .jpeg()
    .toBuffer();
  const fileBBuffer = await sharp({
    create: { width: 900, height: 900, channels: 3, background: "black" },
  })
    .jpeg()
    .toBuffer();
  const fileA = new File([new Uint8Array(fileABuffer)], "a.jpg", { type: "image/jpeg" });
  const fileB = new File([new Uint8Array(fileBBuffer)], "b.jpg", { type: "image/jpeg" });

  await assert.rejects(
    () =>
      processAndUploadProductImages(
        {} as never,
        PRODUCT_ID,
        [fileA, fileB],
        0,
        { storageAdapter: wrappedAdapter },
      ),
    /качване/i,
  );

  assert.equal(files.size, 0);
});

test("product storage prefix helper validates UUID scope", () => {
  assert.equal(getProductStoragePrefix(PRODUCT_ID), `products/${PRODUCT_ID}`);
  assert.equal(
    isPathWithinProductScope(`products/${PRODUCT_ID}/image.webp`, PRODUCT_ID),
    true,
  );
  assert.equal(
    isPathWithinProductScope(`products/${OTHER_PRODUCT_ID}/image.webp`, PRODUCT_ID),
    false,
  );
});
