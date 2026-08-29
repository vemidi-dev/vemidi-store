import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  mapProductImportV2,
  normalizeProductImportV2,
} from "@/lib/admin/product-json-import-v2/map-to-mutation";
import { parseProductJsonImportFile } from "@/lib/admin/product-json-import-v2/parse";
import {
  mapValidatedProductImports,
  validateProductJsonImportSync,
} from "@/lib/admin/product-json-import-v2/validate-sync";

const fixtureDir = join(process.cwd(), "tests/fixtures/product-import-v2");

test("normalize maps v1 aliases with warnings", () => {
  const { product, warnings } = normalizeProductImportV2(
    {
      name: "Demo",
      slug: "demo-product",
      price: 3,
      description: "Description",
      categories: ["cat-a"],
      primary_category: "cat-a",
      short_description: "Short",
      personalization_notes: "Notes",
      product_code: "ABC-01",
      images: [{ original_filename: "a.png", alt: "Alt text" }],
    },
    undefined,
    "product-1",
  );

  assert.ok(product);
  assert.equal(product?.subtitle, "Short");
  assert.equal(product?.personalizationInfo, "Notes");
  assert.ok(warnings.some((warning) => warning.code === "SHORT_DESCRIPTION_ALIAS"));
  assert.ok(
    warnings.some((warning) => warning.code === "PERSONALIZATION_NOTES_ALIAS"),
  );
  assert.ok(warnings.some((warning) => warning.code === "PRODUCT_CODE_IGNORED"));
});

test("normalize forces is_customizable when personalization fields exist", () => {
  const { product } = normalizeProductImportV2(
    {
      name: "Demo",
      slug: "demo-product",
      price: 3,
      description: "Description",
      categories: ["cat-a"],
      primary_category: "cat-a",
      is_customizable: false,
      personalization_fields: [
        {
          label: "Name",
          field_key: "name",
          field_type: "text",
          required: true,
        },
      ],
      images: [{ original_filename: "a.png", alt: "Alt text" }],
    },
    undefined,
    "product-1",
  );

  assert.equal(product?.isCustomizable, true);
});

test("mapProductImportV2 produces mutation payload without category IDs", () => {
  const mapped = mapProductImportV2(
    {
      name: "Demo",
      slug: "demo-product",
      price: 3,
      description: "Description",
      categories: ["cat-a", "cat-b"],
      primary_category: "cat-b",
      images: [{ original_filename: "a.png", alt: "Alt text" }],
    },
    { promo_code_eligible: false },
    "product-1",
  );

  assert.equal(mapped.ok, true);
  if (!mapped.ok) {
    return;
  }

  assert.deepEqual(mapped.payload.categorySlugs, ["cat-a", "cat-b"]);
  assert.equal(mapped.payload.primaryCategorySlug, "cat-b");
  assert.equal(mapped.payload.mutationInput.slug, "demo-product");
  assert.equal(mapped.payload.mutationInput.imageUrl, null);
  assert.equal(mapped.payload.postCreate.promoCodeEligible, false);
});

test("mapValidatedProductImports maps darvena fixture end-to-end", () => {
  const parsed = parseProductJsonImportFile(
    readFileSync(join(fixtureDir, "darvena-liniyka.json"), "utf8"),
  );
  assert.equal(parsed.ok, true);
  if (!parsed.ok) {
    return;
  }

  const validated = validateProductJsonImportSync(parsed.file, [
    "ChatGPT Image Aug 29, 2026, 04_41_32 PM.png",
    "ChatGPT Image Aug 29, 2026, 04_30_14 PM.png",
    "1Asset 6.png",
    "ChatGPT Image Aug 29, 2026, 04_17_00 PM.png",
  ]);
  assert.equal(validated.ok, true);

  const mapped = mapValidatedProductImports(validated.normalizedProducts);
  assert.equal(mapped.length, 1);
  assert.equal(mapped[0]?.mutationInput.name, "Дървена линийка с име – Молив");
  assert.equal(mapped[0]?.mutationInput.personalizationFields.length, 1);
  assert.equal(mapped[0]?.primaryCategorySlug, "liniyki");
});
