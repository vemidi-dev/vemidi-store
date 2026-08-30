import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  buildProductJsonImportRuntimeFailure,
  parseProductJsonImportFormData,
  submitProductJsonImport,
} from "@/lib/admin/product-json-import-v2/import-submit";
import { createMockProductImportSupabase } from "./helpers/mock-product-import-supabase";

const fixtureDir = join(process.cwd(), "tests/fixtures/product-import-v2");
const json = readFileSync(join(fixtureDir, "darvena-liniyka.json"), "utf8");

const categories = [
  { id: "cat-1", slug: "za-uchilishte-i-detska-gradina", category_type: "occasion" },
  { id: "cat-2", slug: "liniyki", category_type: "product" },
];

function makeImportFormData() {
  const formData = new FormData();
  formData.set("json", json);
  formData.append(
    "image_files",
    new File(["fake-image"], "1Asset 6.png", { type: "image/png" }),
  );
  return formData;
}

test("parseProductJsonImportFormData rejects empty json", () => {
  const formData = new FormData();
  const parsed = parseProductJsonImportFormData(formData);
  assert.equal(parsed.ok, false);
  if (!parsed.ok) {
    assert.match(parsed.message, /JSON payload/);
  }
});

test("submitProductJsonImport returns structured runtime failure when import throws", async () => {
  const supabase = createMockProductImportSupabase({ categories });

  const result = await submitProductJsonImport(supabase, makeImportFormData(), {
    runImport: async () => {
      throw new Error("sharp exploded");
    },
  });

  assert.equal(result.ok, false);
  assert.match(result.failed[0]?.message ?? "", /sharp exploded/);
  assert.deepEqual(result.created, []);
});

test("buildProductJsonImportRuntimeFailure always returns serializable summary shape", () => {
  const failure = buildProductJsonImportRuntimeFailure("boom");
  assert.equal(failure.ok, false);
  assert.deepEqual(failure.created, []);
  assert.equal(failure.failed.length, 1);
  assert.equal(JSON.parse(JSON.stringify(failure)).failed[0].message, "boom");
});

test("import submit route declares node runtime and extended duration", () => {
  const routeSource = readFileSync(
    join(process.cwd(), "app/admin/product-import/route.ts"),
    "utf8",
  );

  assert.match(routeSource, /export const runtime = "nodejs"/);
  assert.match(routeSource, /export const maxDuration = 60/);
  assert.match(routeSource, /submitProductJsonImport/);
  assert.match(routeSource, /buildProductJsonImportRuntimeFailure/);
});

test("import action delegates to shared submit helper with runtime catch", () => {
  const actionSource = readFileSync(
    join(process.cwd(), "app/admin/product-import-actions.ts"),
    "utf8",
  );

  assert.match(actionSource, /submitProductJsonImport/);
  assert.doesNotMatch(actionSource, /await runImportProductsFromJson/);
});
