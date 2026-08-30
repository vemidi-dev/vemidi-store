import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  runImportProductsFromJson,
  runValidateProductJsonImport,
} from "@/lib/admin/product-json-import-v2/import-service";
import { createMockProductImportSupabase } from "./helpers/mock-product-import-supabase";

const fixtureDir = join(process.cwd(), "tests/fixtures/product-import-v2");
const json = readFileSync(join(fixtureDir, "darvena-liniyka.json"), "utf8");

const categories = [
  { id: "cat-1", slug: "za-uchilishte-i-detska-gradina", category_type: "occasion" },
  { id: "cat-2", slug: "liniyki", category_type: "product" },
];

const uploads = [
  "ChatGPT Image Aug 29, 2026, 04_41_32 PM.png",
  "ChatGPT Image Aug 29, 2026, 04_30_14 PM.png",
  "1Asset 6.png",
  "ChatGPT Image Aug 29, 2026, 04_17_00 PM.png",
];

function makeUploadFiles() {
  return uploads.map(
    (name) =>
      new File(["fake-image"], name, {
        type: "image/png",
      }),
  );
}

test("validate action path returns happy validation result", async () => {
  const supabase = createMockProductImportSupabase({ categories });
  const result = await runValidateProductJsonImport(supabase, {
    json,
    uploadedFilenames: uploads,
  });

  assert.equal(result.ok, true);
  assert.equal(result.importableProducts.length, 1);
});

test("validate action path allows renamed uploads for one product", async () => {
  const supabase = createMockProductImportSupabase({ categories });
  const result = await runValidateProductJsonImport(supabase, {
    json,
    uploadedFilenames: ["renamed-hero.png", "renamed-detail.png"],
  });

  assert.equal(result.ok, true);
  assert.equal(result.importableProducts.length, 1);
  assert.ok(
    result.previews[0]?.warnings.some(
      (warning) => warning.code === "IMAGE_MATCHED_BY_UPLOAD_ORDER",
    ),
  );
});

test("import happy path creates draft product", async () => {
  const supabase = createMockProductImportSupabase({
    categories,
    createProductId: "created-product-id",
  });

  const summary = await runImportProductsFromJson(
    supabase,
    json,
    makeUploadFiles(),
    {
      createDraft: async () => ({
        ok: true,
        productId: "created-product-id",
        imageCount: 4,
        uploadedImages: [],
      }),
    },
  );

  assert.equal(summary.ok, true);
  assert.equal(summary.created.length, 1);
  assert.equal(summary.created[0]?.slug, "darvena-liniyka-s-ime-moliv");
  assert.match(summary.created[0]?.editUrl ?? "", /editProduct=created-product-id/);
});

test("import uses renamed files by upload order for one product", async () => {
  const supabase = createMockProductImportSupabase({
    categories,
    createProductId: "created-product-id",
  });

  const summary = await runImportProductsFromJson(
    supabase,
    json,
    [
      new File(["hero"], "renamed-hero.png", { type: "image/png" }),
      new File(["detail"], "renamed-detail.png", { type: "image/png" }),
      new File(["extra"], "renamed-extra.png", { type: "image/png" }),
    ],
    {
      createDraft: async (_client, input) => {
        assert.deepEqual(
          input.imageFiles.map((file) => file.name),
          ["renamed-hero.png", "renamed-detail.png", "renamed-extra.png"],
        );
        assert.equal(input.imageAltTexts.length, 3);
        return {
          ok: true,
          productId: "created-product-id",
          imageCount: input.imageFiles.length,
          uploadedImages: [],
        };
      },
    },
  );

  assert.equal(summary.ok, true);
  assert.equal(summary.created[0]?.imageCount, 3);
  assert.ok(
    summary.warnings.some(
      (warning) => warning.code === "IMAGE_MATCHED_BY_UPLOAD_ORDER",
    ),
  );
});

test("import can create a draft without uploaded images", async () => {
  const supabase = createMockProductImportSupabase({
    categories,
    createProductId: "created-product-id",
  });

  const summary = await runImportProductsFromJson(supabase, json, [], {
    createDraft: async (_client, input) => {
      assert.deepEqual(input.imageFiles, []);
      assert.deepEqual(input.imageAltTexts, []);
      return {
        ok: true,
        productId: "created-product-id",
        imageCount: 0,
        uploadedImages: [],
      };
    },
  });

  assert.equal(summary.ok, true);
  assert.equal(summary.created[0]?.imageCount, 0);
  assert.ok(
    summary.warnings.some((warning) => warning.code === "NO_IMAGES_UPLOADED"),
  );
});

test("import continues when one product gallery fails", async () => {
  const multiProductJson = JSON.stringify({
    version: 2,
    products: [
      {
        name: "Product A",
        slug: "product-a",
        price: 1,
        description: "A",
        categories: ["liniyki"],
        primary_category: "liniyki",
        images: [{ original_filename: "a.png", alt: "A" }],
      },
      {
        name: "Product B",
        slug: "product-b",
        price: 2,
        description: "B",
        categories: ["liniyki"],
        primary_category: "liniyki",
        images: [{ original_filename: "b.png", alt: "B" }],
      },
    ],
  });

  const supabase = createMockProductImportSupabase({
    categories: [{ id: "cat-2", slug: "liniyki", category_type: "product" }],
  });

  const summary = await runImportProductsFromJson(
    supabase,
    multiProductJson,
    [
      new File(["a"], "a.png", { type: "image/png" }),
      new File(["b"], "b.png", { type: "image/png" }),
    ],
    {
      createDraft: async (_client, input) => {
        if (input.mutationInput.slug === "product-a") {
          return {
            ok: false,
            stage: "gallery",
            productId: "draft-a",
            message: "gallery failed",
          };
        }

        return {
          ok: true,
          productId: "draft-b",
          imageCount: 1,
          uploadedImages: [],
        };
      },
    },
  );

  assert.equal(summary.created.length, 1);
  assert.equal(summary.created[0]?.slug, "product-b");
  assert.equal(summary.failed.length, 1);
  assert.equal(summary.failed[0]?.slug, "product-a");
  assert.equal(summary.failed[0]?.stage, "gallery");
});

test("import keeps strict filename matching for multi-product imports", async () => {
  const multiProductJson = JSON.stringify({
    version: 2,
    products: [
      {
        name: "Product A",
        slug: "product-a",
        price: 1,
        description: "A",
        categories: ["liniyki"],
        primary_category: "liniyki",
        images: [{ original_filename: "a.png", alt: "A" }],
      },
      {
        name: "Product B",
        slug: "product-b",
        price: 2,
        description: "B",
        categories: ["liniyki"],
        primary_category: "liniyki",
        images: [{ original_filename: "b.png", alt: "B" }],
      },
    ],
  });

  const supabase = createMockProductImportSupabase({ categories });

  const summary = await runImportProductsFromJson(
    supabase,
    multiProductJson,
    [new File(["only"], "renamed.png", { type: "image/png" })],
  );

  assert.equal(summary.created.length, 0);
  assert.ok(summary.failed.some((entry) => entry.stage === "validate"));
});

test("validate import path performs no product writes", async () => {
  const supabase = createMockProductImportSupabase({ categories }) as ReturnType<
    typeof createMockProductImportSupabase
  > & { writes: string[] };

  await runValidateProductJsonImport(supabase, {
    json,
    uploadedFilenames: uploads,
  });

  assert.deepEqual(supabase.writes, []);
});
