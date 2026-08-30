import assert from "node:assert/strict";
import test from "node:test";

import {
  buildUploadFilenameIndex,
  detectUnusedUploads,
  matchProductImagesToUploads,
  normalizeImageBasename,
  sortProductImages,
} from "@/lib/admin/product-json-import-v2/match-images";

test("normalizeImageBasename strips path and lowercases", () => {
  assert.equal(
    normalizeImageBasename("C:\\Photos\\ChatGPT Image.png"),
    "chatgpt image.png",
  );
  assert.equal(
    normalizeImageBasename("folder/sub/1Asset 6.png"),
    "1asset 6.png",
  );
});

test("sortProductImages puts primary first and preserves order", () => {
  const sorted = sortProductImages([
    { original_filename: "b.png", alt: "B" },
    { original_filename: "a.png", alt: "A", primary: true },
    { original_filename: "c.png", alt: "C" },
  ]);

  assert.deepEqual(
    sorted.map((image) => image.original_filename),
    ["a.png", "b.png", "c.png"],
  );
});

test("matchProductImagesToUploads matches case-insensitively", () => {
  const result = matchProductImagesToUploads(
    "demo-product",
    [
      { original_filename: "Hero.PNG", alt: "Hero" },
      { original_filename: "gallery/sub/detail.jpg", alt: "Detail" },
    ],
    ["hero.png", "DETAIL.JPG"],
  );

  assert.equal(result.errors.length, 0);
  assert.deepEqual(result.matchedOriginalFilenames, ["hero.png", "DETAIL.JPG"]);
  assert.deepEqual(
    result.sortedImages.map((image) => image.original_filename),
    ["Hero.PNG", "gallery/sub/detail.jpg"],
  );
});

test("matchProductImagesToUploads reports missing files", () => {
  const result = matchProductImagesToUploads(
    "demo-product",
    [{ original_filename: "missing.png", alt: "Missing" }],
    [],
  );

  assert.ok(
    result.errors.some((error) => error.code === "IMAGE_FILE_MISSING"),
  );
});

test("matchProductImagesToUploads falls back to upload order when names differ", () => {
  const result = matchProductImagesToUploads(
    "demo-product",
    [
      { original_filename: "json-hero.png", alt: "Hero alt", primary: true },
      { original_filename: "json-detail.png", alt: "Detail alt" },
    ],
    ["renamed-1.png", "renamed-2.png", "renamed-3.png"],
  );

  assert.equal(result.errors.length, 0);
  assert.ok(
    result.warnings.some(
      (warning) => warning.code === "IMAGE_MATCHED_BY_UPLOAD_ORDER",
    ),
  );
  assert.ok(
    result.warnings.some((warning) => warning.code === "EXTRA_UPLOADS_USED"),
  );
  assert.deepEqual(
    result.sortedImages.map((image) => image.original_filename),
    ["renamed-1.png", "renamed-2.png", "renamed-3.png"],
  );
  assert.deepEqual(
    result.sortedImages.map((image) => image.alt),
    ["Hero alt", "Detail alt", "demo-product - допълнителна снимка 3"],
  );
});

test("matchProductImagesToUploads allows fewer uploads by order", () => {
  const result = matchProductImagesToUploads(
    "demo-product",
    [
      { original_filename: "json-hero.png", alt: "Hero alt", primary: true },
      { original_filename: "json-detail.png", alt: "Detail alt" },
    ],
    ["renamed-1.png"],
  );

  assert.equal(result.errors.length, 0);
  assert.ok(
    result.warnings.some((warning) => warning.code === "FEWER_UPLOADS_USED"),
  );
  assert.deepEqual(
    result.sortedImages.map((image) => image.original_filename),
    ["renamed-1.png"],
  );
});

test("matchProductImagesToUploads can keep strict filename matching", () => {
  const result = matchProductImagesToUploads(
    "demo-product",
    [{ original_filename: "json-hero.png", alt: "Hero alt", primary: true }],
    ["renamed-1.png"],
    { allowUploadOrderFallback: false },
  );

  assert.ok(
    result.errors.some((error) => error.code === "IMAGE_FILE_MISSING"),
  );
});

test("buildUploadFilenameIndex detects duplicate upload basenames", () => {
  const { duplicateBasenames } = buildUploadFilenameIndex([
    "photos/a.png",
    "other/A.PNG",
  ]);
  assert.deepEqual(duplicateBasenames, ["a.png"]);
});

test("detectUnusedUploads finds unreferenced files", () => {
  const unused = detectUnusedUploads(
    ["hero.png", "extra.png"],
    new Set(["hero.png"]),
  );
  assert.deepEqual(unused, ["extra.png"]);
});
