import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { parseProductJsonImportFile } from "@/lib/admin/product-json-import-v2/parse";

const fixtureDir = join(process.cwd(), "tests/fixtures/product-import-v2");

test("parse accepts v2 fixture", () => {
  const raw = readFileSync(join(fixtureDir, "darvena-liniyka.json"), "utf8");
  const result = parseProductJsonImportFile(raw);

  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  assert.equal(result.file.version, 2);
  assert.equal(result.file.import_key, "darvena-liniyka-s-ime-moliv-2026-08-30");
  assert.equal(result.file.products.length, 1);
  assert.equal(result.file.products[0]?.slug, "darvena-liniyka-s-ime-moliv");
});

test("parse rejects invalid JSON", () => {
  const result = parseProductJsonImportFile("{");
  assert.equal(result.ok, false);
  if (result.ok) {
    return;
  }
  assert.equal(result.code, "INVALID_JSON");
});

test("parse rejects unsupported version", () => {
  const raw = readFileSync(join(fixtureDir, "invalid-version.json"), "utf8");
  const result = parseProductJsonImportFile(raw);
  assert.equal(result.ok, false);
  if (result.ok) {
    return;
  }
  assert.equal(result.code, "UNSUPPORTED_VERSION");
});

test("parse rejects empty products array", () => {
  const result = parseProductJsonImportFile(
    JSON.stringify({ version: 2, products: [] }),
  );
  assert.equal(result.ok, false);
  if (result.ok) {
    return;
  }
  assert.equal(result.code, "EMPTY_PRODUCTS");
});

test("parse rejects too many products", () => {
  const products = Array.from({ length: 26 }, (_, index) => ({
    name: `Product ${index}`,
    slug: `product-${index}`,
    price: 1,
    description: "Desc",
    categories: ["cat"],
    primary_category: "cat",
    images: [{ original_filename: "a.png", alt: "Alt" }],
  }));

  const result = parseProductJsonImportFile(
    JSON.stringify({ version: 2, products }),
  );
  assert.equal(result.ok, false);
  if (result.ok) {
    return;
  }
  assert.equal(result.code, "TOO_MANY_PRODUCTS");
});
