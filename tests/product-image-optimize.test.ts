import assert from "node:assert/strict";
import test from "node:test";

import sharp from "sharp";

import {
  optimizeProductImageBuffer,
  validateProductImageInputSize,
} from "@/lib/admin/product-image-optimize";
import {
  PRODUCT_IMAGE_MAX_INPUT_BYTES,
  PRODUCT_IMAGE_MAX_LONG_EDGE,
} from "@/lib/admin/product-image-constants";

async function createTestImage(
  width: number,
  height: number,
  format: "jpeg" | "png" | "webp" = "jpeg",
) {
  const instance = sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 120, g: 80, b: 40 },
    },
  });

  if (format === "png") {
    return instance.png().toBuffer();
  }
  if (format === "webp") {
    return instance.webp().toBuffer();
  }
  return instance.jpeg().toBuffer();
}

test("valid JPEG is converted to WebP", async () => {
  const input = await createTestImage(1200, 800, "jpeg");
  const result = await optimizeProductImageBuffer(input, input.length);

  assert.match(result.buffer.subarray(0, 4).toString("hex"), /^52494646/);
  assert.ok(result.optimizedSize > 0);
  assert.ok(result.optimizedSize <= result.originalSize || result.originalSize < 1024);
});

test("valid PNG and WebP inputs are accepted", async () => {
  const png = await createTestImage(900, 900, "png");
  const webp = await createTestImage(900, 900, "webp");

  const pngResult = await optimizeProductImageBuffer(png, png.length);
  const webpResult = await optimizeProductImageBuffer(webp, webp.length);

  assert.equal(pngResult.width, 900);
  assert.equal(webpResult.width, 900);
});

test("long edge is limited to 1800 px without upscaling small images", async () => {
  const large = await createTestImage(2400, 1200, "jpeg");
  const small = await createTestImage(900, 700, "jpeg");

  const largeResult = await optimizeProductImageBuffer(large, large.length);
  const smallResult = await optimizeProductImageBuffer(small, small.length);

  assert.equal(Math.max(largeResult.width, largeResult.height), PRODUCT_IMAGE_MAX_LONG_EDGE);
  assert.equal(smallResult.width, 900);
  assert.equal(smallResult.height, 700);
});

test("aspect ratio is preserved during resize", async () => {
  const input = await createTestImage(2000, 1000, "jpeg");
  const result = await optimizeProductImageBuffer(input, input.length);
  const ratio = result.width / result.height;

  assert.ok(Math.abs(ratio - 2) < 0.01);
});

test("EXIF orientation is applied before resize", async () => {
  const input = await sharp({
    create: {
      width: 1600,
      height: 800,
      channels: 3,
      background: { r: 10, g: 20, b: 30 },
    },
  })
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toBuffer();

  const result = await optimizeProductImageBuffer(input, input.length);

  assert.equal(result.width, 800);
  assert.equal(result.height, 1600);
});

test("files above 10 MB are rejected", () => {
  assert.throws(
    () => validateProductImageInputSize(PRODUCT_IMAGE_MAX_INPUT_BYTES + 1),
    /надвишава максималния размер/,
  );
});

test("unsupported or corrupted files are rejected", async () => {
  await assert.rejects(
    () => optimizeProductImageBuffer(Buffer.from("not-an-image"), 12),
    /повреден|неподдържан/i,
  );

  const gif = await sharp({
    create: { width: 100, height: 100, channels: 3, background: "green" },
  })
    .gif()
    .toBuffer();

  await assert.rejects(
    () => optimizeProductImageBuffer(gif, gif.length),
    /JPEG, PNG и WebP/i,
  );
});

test("images below 480 px short edge are rejected for products", async () => {
  const input = await createTestImage(900, 400, "jpeg");

  await assert.rejects(
    () => optimizeProductImageBuffer(input, input.length),
    /малко/i,
  );
});

test("product images with 480 px short edge are accepted", async () => {
  const input = await createTestImage(900, 480, "jpeg");
  const result = await optimizeProductImageBuffer(input, input.length);
  assert.equal(result.height, 480);
});
