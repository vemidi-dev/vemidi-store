import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  formatProductImportBytes,
  shouldCompressProductImportImage,
} from "@/lib/admin/product-json-import-v2/client-image-compress";

test("product import image compression keeps small images unchanged", () => {
  const file = new File(["small"], "photo.png", { type: "image/png" });
  assert.equal(shouldCompressProductImportImage(file), false);
});

test("product import image compression can force medium images in a large bundle", () => {
  const file = new File([new Uint8Array(300 * 1024)], "photo.png", {
    type: "image/png",
  });
  assert.equal(shouldCompressProductImportImage(file, true), true);
});

test("product import image compression targets large raster images", () => {
  const file = new File([new Uint8Array(950 * 1024)], "photo.jpg", {
    type: "image/jpeg",
  });
  assert.equal(shouldCompressProductImportImage(file), true);
});

test("product import image compression ignores non-raster files", () => {
  const file = new File([new Uint8Array(950 * 1024)], "shape.svg", {
    type: "image/svg+xml",
  });
  assert.equal(shouldCompressProductImportImage(file), false);
});

test("product import panel prepares images before multipart submit", () => {
  const panelSource = readFileSync(
    join(process.cwd(), "components/admin/product-json-import-panel.tsx"),
    "utf8",
  );

  assert.match(panelSource, /prepareProductImportImages/);
  assert.match(panelSource, /preparedImages\.files/);
  assert.match(panelSource, /response\.status === 413/);
});

test("formatProductImportBytes formats compact upload sizes", () => {
  assert.equal(formatProductImportBytes(512 * 1024), "512 KB");
  assert.equal(formatProductImportBytes(1536 * 1024), "1.5 MB");
});
