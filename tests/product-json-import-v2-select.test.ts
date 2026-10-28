import assert from "node:assert/strict";
import test from "node:test";
import { parseProductJsonImportFile } from "@/lib/admin/product-json-import-v2/parse";
import { validateProductJsonImportSync } from "@/lib/admin/product-json-import-v2/validate-sync";
import { runImportProductsFromJson } from "@/lib/admin/product-json-import-v2/import-service";
import { mapNormalizedProductImportToMutation } from "@/lib/admin/product-json-import-v2/map-to-mutation";
import { splitSelectPersonalizationFields } from "@/lib/admin/product-json-import-v2/select-fields";
import { buildProductMutationRpcPayload } from "@/lib/admin/product-rpc";
import { calculateEstimatedUnitPrice } from "@/lib/product-option-pricing";
import { validateProductOptionSelections } from "@/lib/product-option-validation";
import type { ProductOptionGroup } from "@/lib/product-options";
import { createMockProductImportSupabase } from "./helpers/mock-product-import-supabase";

function tray() {
  return { version: 2, products: [{ name: "Персонализиран поднос за Дядо Коледа", slug: "personaliziran-podnos-za-dyado-koleda", price: 12,
    description: "Два размера", categories: ["za-doma", "koleda"], primary_category: "za-doma",
    personalization_fields: [
      { label: "Размер", field_key: "size", field_type: "select", required: true, price_delta: 0, options: [
        { label: "Малък – 25 × 16 см", value: "small-25x16", price_delta: 0 },
        { label: "Голям – 30 × 19 см", value: "large-30x19", price_delta: 6 },
      ] },
      { label: "Име или имена", field_key: "names", field_type: "text", max_length: 80, required: true },
    ], images: [{ original_filename: "podnosche-2.png", alt: "Лице" }, { original_filename: "podnosche 1.png", alt: "Детайл" }],
  }] };
}

test("select becomes a required native option group while names remain personalization", () => {
  const parsed = parseProductJsonImportFile(JSON.stringify(tray()));
  assert.equal(parsed.ok, true); if (!parsed.ok) return;
  const validated = validateProductJsonImportSync(parsed.file, ["podnosche-2.png", "podnosche 1.png"]);
  assert.equal(validated.ok, true);
  const product = validated.normalizedProducts[0]!;
  assert.deepEqual(product.personalizationFields.map(field => field.key), ["names"]);
  const group = product.optionGroups[0]!;
  assert.equal(group.inputType, "single"); assert.equal(group.key, "size");
  assert.equal(group.isRequired, true); assert.equal(group.minSelect, 1); assert.equal(group.maxSelect, 1);
  assert.deepEqual(group.values.map(value => [value.key, value.priceDelta]), [["small_25x16", 0], ["large_30x19", 6]]);
  assert.equal(validated.previews[0]?.optionGroups?.[0]?.values.length, 2);
  const payload = mapNormalizedProductImportToMutation(product);
  assert.deepEqual(payload.mutationInput.optionGroups, product.optionGroups);
});

test("import forwards size choices and surcharges into the atomic create payload", async () => {
  const client = createMockProductImportSupabase({ categories: [
    { id: "home-id", slug: "za-doma", category_type: "product" },
    { id: "christmas-id", slug: "koleda", category_type: "occasion" },
  ] });
  let calls = 0;
  const result = await runImportProductsFromJson(client, JSON.stringify(tray()), [], { createDraft: async (_client, input) => {
    calls++;
    const rpc = buildProductMutationRpcPayload(input.mutationInput);
    assert.deepEqual(rpc.p_personalization_fields.map(field => field.field_key), ["names"]);
    assert.equal(rpc.p_option_groups[0]?.key, "size");
    assert.deepEqual(rpc.p_option_groups[0]?.values.map(value => value.price_delta), [0, 6]);
    return { ok: true, productId: "test-tray", imageCount: 0, uploadedImages: [] };
  } });
  assert.equal(result.ok, true); assert.equal(calls, 1);
});

test("native selection and pricing preserve 12/18 EUR and reject a missing or forged size", () => {
  const group = splitSelectPersonalizationFields(tray().products[0]!.personalization_fields, "tray").groups[0]!;
  const native: ProductOptionGroup = { ...group, id: "size-group", values: group.values.map((value, index) => ({ ...value, id: `size-${index}` })) };
  assert.equal(calculateEstimatedUnitPrice(12, [native], [{ groupId: native.id, valueIds: ["size-0"] }]), 12);
  assert.equal(calculateEstimatedUnitPrice(12, [native], [{ groupId: native.id, valueIds: ["size-1"] }]), 18);
  assert.equal(validateProductOptionSelections("tray", [native], []).ok, false);
  assert.equal(validateProductOptionSelections("tray", [native], [{ groupId: native.id, valueIds: ["forged"] }]).ok, false);
  assert.equal(validateProductOptionSelections("tray", [native], [{ groupId: native.id, valueIds: ["size-1"] }]).ok, true);
});

test("malformed choices, ambiguous prices and colliding keys are blocking errors", () => {
  const valid = tray().products[0]!.personalization_fields[0]!;
  const invalid: unknown[] = [
    { ...valid, options: [] }, { ...valid, options: "small" },
    { ...valid, options: [{ label: "Large", value: "large", price_delta: -1 }] },
    { ...valid, options: [{ label: "Large", value: "large", price_delta: "6" }] },
    { ...valid, options: [{ label: "Large", value: "large", price_delta: 0.001 }] },
    { ...valid, options: [{ label: "Large", value: "large", price: 18 }] },
    { ...valid, price_delta: -1 }, { ...valid, required: "true" },
    { ...valid, options: [{ label: "A", value: "a-b" }, { label: "B", value: "a_b" }] },
    { ...valid, options: [{ label: "A", value: "a", is_default: true }, { label: "B", value: "b", is_default: true }] },
  ];
  for (const field of invalid) assert.ok(splitSelectPersonalizationFields([field], "tray").errors.length);
  assert.ok(splitSelectPersonalizationFields([valid, { label: "Text size", field_key: "size", field_type: "text" }], "tray").errors.length);
});

test("optional choice can remain empty and group-level surcharge is applied only once", () => {
  const select = tray().products[0]!.personalization_fields[0]!;
  const result = splitSelectPersonalizationFields([{ ...select, required: false, price_delta: 1.5 }], "tray");
  assert.equal(result.errors.length, 0);
  assert.equal(result.groups[0]?.minSelect, 0);
  assert.deepEqual(result.groups[0]?.values.map(value => value.priceDelta), [1.5, 7.5]);
});
