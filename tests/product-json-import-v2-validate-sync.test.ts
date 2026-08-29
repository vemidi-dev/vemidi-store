import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { parseProductJsonImportFile } from "@/lib/admin/product-json-import-v2/parse";
import { validateProductJsonImportSync } from "@/lib/admin/product-json-import-v2/validate-sync";

const fixtureDir = join(process.cwd(), "tests/fixtures/product-import-v2");

function loadDarvenaFile() {
  const parsed = parseProductJsonImportFile(
    readFileSync(join(fixtureDir, "darvena-liniyka.json"), "utf8"),
  );
  assert.equal(parsed.ok, true);
  if (!parsed.ok) {
    throw new Error("fixture parse failed");
  }
  return parsed.file;
}

test("validate accepts darvena fixture with uploads", () => {
  const file = loadDarvenaFile();
  const uploads = [
    "ChatGPT Image Aug 29, 2026, 04_41_32 PM.png",
    "ChatGPT Image Aug 29, 2026, 04_30_14 PM.png",
    "1Asset 6.png",
    "ChatGPT Image Aug 29, 2026, 04_17_00 PM.png",
  ];

  const result = validateProductJsonImportSync(file, uploads);
  assert.equal(result.ok, true);
  assert.equal(result.previews.length, 1);
  assert.equal(result.previews[0]?.status, "warning");
  assert.equal(result.normalizedProducts.length, 1);
  assert.ok(
    result.previews[0]?.warnings.some((warning) => warning.code === "PRODUCT_CODE_IGNORED"),
  );
});

test("validate reports duplicate slug in file", () => {
  const file = loadDarvenaFile();
  file.products.push(structuredClone(file.products[0]!));

  const result = validateProductJsonImportSync(file);
  assert.equal(result.ok, false);
  assert.ok(
    result.fileErrors.some((error) => error.code === "DUPLICATE_SLUG_IN_FILE"),
  );
});

test("validate rejects invalid slug", () => {
  const file = loadDarvenaFile();
  file.products[0]!.slug = "Invalid Slug";

  const result = validateProductJsonImportSync(file);
  assert.equal(result.ok, false);
  assert.ok(
    result.previews[0]?.errors.some((error) => error.code === "INVALID_SLUG"),
  );
});

test("validate rejects primary_category outside categories", () => {
  const file = loadDarvenaFile();
  file.products[0]!.primary_category = "missing-category";

  const result = validateProductJsonImportSync(file);
  assert.equal(result.ok, false);
  assert.ok(
    result.previews[0]?.errors.some(
      (error) => error.code === "PRIMARY_CATEGORY_NOT_IN_CATEGORIES",
    ),
  );
});

test("validate rejects missing image upload", () => {
  const file = loadDarvenaFile();
  const result = validateProductJsonImportSync(file, ["1Asset 6.png"]);

  assert.equal(result.ok, false);
  assert.ok(
    result.previews[0]?.errors.some((error) => error.code === "IMAGE_FILE_MISSING"),
  );
});

test("validate warns on unused uploads", () => {
  const file = loadDarvenaFile();
  const result = validateProductJsonImportSync(file, [
    "ChatGPT Image Aug 29, 2026, 04_41_32 PM.png",
    "ChatGPT Image Aug 29, 2026, 04_30_14 PM.png",
    "1Asset 6.png",
    "ChatGPT Image Aug 29, 2026, 04_17_00 PM.png",
    "extra-photo.png",
  ]);

  assert.equal(result.ok, true);
  assert.ok(
    result.fileWarnings.some((warning) => warning.code === "UNUSED_UPLOAD"),
  );
});

test("validate rejects overlapping quantity tiers", () => {
  const file = loadDarvenaFile();
  file.products[0]!.quantity_price_tiers = [
    { minQuantity: 1, maxQuantity: 10, unitPrice: 2 },
    { minQuantity: 10, maxQuantity: null, unitPrice: 1.5 },
  ];

  const result = validateProductJsonImportSync(file);
  assert.equal(result.ok, false);
  assert.ok(
    result.previews[0]?.errors.some(
      (error) => error.code === "QUANTITY_TIERS_INVALID",
    ),
  );
});

test("validate rejects multiple primary images", () => {
  const file = loadDarvenaFile();
  const images = file.products[0]!.images as Array<Record<string, unknown>>;
  images[1] = { ...images[1], primary: true };

  const result = validateProductJsonImportSync(file);
  assert.equal(result.ok, false);
  assert.ok(
    result.previews[0]?.errors.some(
      (error) => error.code === "MULTIPLE_PRIMARY_IMAGES",
    ),
  );
});

test("validate rejects invalid personalization field key", () => {
  const file = loadDarvenaFile();
  const fields = file.products[0]!.personalization_fields as Array<
    Record<string, unknown>
  >;
  fields[0] = { ...fields[0], field_key: "Bad-Key" };

  const result = validateProductJsonImportSync(file);
  assert.equal(result.ok, false);
  assert.ok(
    result.previews[0]?.errors.some(
      (error) => error.code === "INVALID_PERSONALIZATION_FIELD",
    ),
  );
});
