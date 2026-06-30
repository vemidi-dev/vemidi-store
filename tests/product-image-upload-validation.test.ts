import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  PRODUCT_IMAGE_MAX_INPUT_BYTES,
} from "@/lib/admin/product-image-constants";
import { validateProductImageUploadBatch } from "@/lib/admin/product-image-upload";
import {
  hasValidImageSignature,
  validateImageUploadFileContent,
  validateImageUploadMimeType,
} from "@/lib/images/validate-image-file";

function makeJpegFile(size = 1024, name = "photo.jpg") {
  const bytes = new Uint8Array(size);
  bytes[0] = 0xff;
  bytes[1] = 0xd8;
  bytes[2] = 0xff;
  bytes[3] = 0xe0;
  return new File([bytes], name, { type: "image/jpeg" });
}

test("product profile enforces 10 MB upload limit", () => {
  assert.equal(PRODUCT_IMAGE_MAX_INPUT_BYTES, 10 * 1024 * 1024);
});

test("server actions allow multi-image product uploads", () => {
  const source = readFileSync(new URL("../next.config.ts", import.meta.url), "utf8");

  assert.match(source, /bodySizeLimit:\s*["']160mb["']/);
});

test("validateImageUploadMimeType rejects unsupported formats", () => {
  const gif = new File([new Uint8Array([1, 2, 3])], "photo.gif", { type: "image/gif" });
  assert.match(validateImageUploadMimeType(gif) ?? "", /JPEG, PNG или WebP/i);
});

test("validateImageUploadFileContent rejects spoofed mime without valid signature", async () => {
  const spoofed = new File([new Uint8Array([1, 2, 3, 4])], "photo.jpg", {
    type: "image/jpeg",
  });

  const error = await validateImageUploadFileContent(spoofed, "product");
  assert.match(error ?? "", /валидно JPEG, PNG или WebP/i);
});

test("validateImageUploadFileContent accepts valid jpeg signature within size limit", async () => {
  const file = makeJpegFile(2048);
  assert.equal(await hasValidImageSignature(file), true);
  assert.equal(await validateImageUploadFileContent(file, "product"), null);
});

test("validateProductImageUploadBatch rejects files above 10 MB", async () => {
  const oversized = makeJpegFile(PRODUCT_IMAGE_MAX_INPUT_BYTES + 1);
  const error = await validateProductImageUploadBatch([oversized], 0);
  assert.match(error ?? "", /10\.00 MB|10,00 MB|надвишава/i);
});

test("processImageFile includes source filename in processing errors", async () => {
  const file = new File([new Uint8Array([1, 2, 3])], "broken-photo.jpg", {
    type: "image/jpeg",
  });

  await assert.rejects(
    () => import("@/lib/images/process-image").then((mod) => mod.processImageFile(file, "product")),
    /„broken-photo\.jpg“/,
  );
});

test("admin product image actions require authorized client", () => {
  const source = readFileSync(new URL("../app/admin/actions.ts", import.meta.url), "utf8");

  assert.match(source, /async function createProduct[\s\S]*?await getAuthorizedClient\(\)/);
  assert.match(source, /async function updateProduct[\s\S]*?await getAuthorizedClient\(\)/);
  assert.match(source, /async function addProductGalleryImages[\s\S]*?await getAuthorizedClient\(\)/);
  assert.match(source, /await validateProductImageUploadBatch\(/);
  assert.match(source, /await processAndUploadProductImages\(/);
});
