import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { parseProductJsonImportFile } from "@/lib/admin/product-json-import-v2/parse";
import { validateProductJsonImportSync } from "@/lib/admin/product-json-import-v2/validate-sync";
import { validateProductJsonImportWithDb } from "@/lib/admin/product-json-import-v2/validate-async";
import { createMockProductImportSupabase } from "./helpers/mock-product-import-supabase";

const fixtureDir = join(process.cwd(), "tests/fixtures/product-import-v2");

function loadValidatedSync() {
  const parsed = parseProductJsonImportFile(
    readFileSync(join(fixtureDir, "darvena-liniyka.json"), "utf8"),
  );
  assert.equal(parsed.ok, true);
  if (!parsed.ok) {
    throw new Error("fixture parse failed");
  }

  return validateProductJsonImportSync(parsed.file, [
    "ChatGPT Image Aug 29, 2026, 04_41_32 PM.png",
    "ChatGPT Image Aug 29, 2026, 04_30_14 PM.png",
    "1Asset 6.png",
    "ChatGPT Image Aug 29, 2026, 04_17_00 PM.png",
  ]);
}

test("async validation blocks slug that already exists", async () => {
  const syncResult = loadValidatedSync();
  const supabase = createMockProductImportSupabase({
    existingSlugs: ["darvena-liniyka-s-ime-moliv"],
    categories: [
      {
        id: "cat-1",
        slug: "za-uchilishte-i-detska-gradina",
        category_type: "occasion",
      },
      { id: "cat-2", slug: "liniyki", category_type: "product" },
    ],
  });

  const result = await validateProductJsonImportWithDb(supabase, syncResult);
  assert.equal(result.ok, false);
  assert.ok(
    result.previews[0]?.errors.some((error) => error.code === "SLUG_TAKEN"),
  );
  assert.equal(result.importableProducts.length, 0);
});

test("async validation blocks missing category slug", async () => {
  const syncResult = loadValidatedSync();
  const supabase = createMockProductImportSupabase({
    categories: [{ id: "cat-2", slug: "liniyki", category_type: "product" }],
  });

  const result = await validateProductJsonImportWithDb(supabase, syncResult);
  assert.equal(result.ok, false);
  assert.ok(
    result.previews[0]?.errors.some((error) => error.code === "CATEGORY_NOT_FOUND"),
  );
});

test("async validation blocks occasion primary category", async () => {
  const syncResult = loadValidatedSync();
  syncResult.normalizedProducts[0]!.primaryCategorySlug =
    "za-uchilishte-i-detska-gradina";
  syncResult.previews[0]!.primaryCategorySlug = "za-uchilishte-i-detska-gradina";

  const supabase = createMockProductImportSupabase({
    categories: [
      {
        id: "cat-1",
        slug: "za-uchilishte-i-detska-gradina",
        category_type: "occasion",
      },
      { id: "cat-2", slug: "liniyki", category_type: "product" },
    ],
  });

  const result = await validateProductJsonImportWithDb(supabase, syncResult);
  assert.equal(result.ok, false);
  assert.ok(
    result.previews[0]?.errors.some((error) => error.code === "INVALID_PRIMARY_CATEGORY"),
  );
});

test("async validation happy path resolves importable product", async () => {
  const syncResult = loadValidatedSync();
  const supabase = createMockProductImportSupabase({
    categories: [
      {
        id: "cat-1",
        slug: "za-uchilishte-i-detska-gradina",
        category_type: "occasion",
      },
      { id: "cat-2", slug: "liniyki", category_type: "product" },
    ],
  });

  const result = await validateProductJsonImportWithDb(supabase, syncResult);
  assert.equal(result.ok, true);
  assert.equal(result.importableProducts.length, 1);
  assert.deepEqual(result.importableProducts[0]?.categoryIds, [
    "cat-1",
    "cat-2",
  ]);
  assert.equal(result.importableProducts[0]?.primaryCategoryId, "cat-2");
});

test("async validation performs no writes", async () => {
  const syncResult = loadValidatedSync();
  const supabase = createMockProductImportSupabase({
    categories: [
      { id: "cat-1", slug: "za-uchilishte-i-detska-gradina", category_type: "occasion" },
      { id: "cat-2", slug: "liniyki", category_type: "product" },
    ],
  }) as ReturnType<typeof createMockProductImportSupabase> & { writes: string[] };

  await validateProductJsonImportWithDb(supabase, syncResult);
  assert.deepEqual(supabase.writes, []);
});
