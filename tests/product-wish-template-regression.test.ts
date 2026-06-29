import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { adminFormFields } from "@/lib/admin/form-fields";
import { buildProductMutationRpcPayload } from "@/lib/admin/product-rpc";
import type { ProductMutationInput } from "@/lib/admin/product-rpc";

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

function minimalProductMutationInput(
  overrides: Partial<ProductMutationInput> = {},
): ProductMutationInput {
  return {
    name: "Тест",
    slug: "test",
    subtitle: null,
    description: "Описание",
    additionalInfo: null,
    personalizationInfo: null,
    dimensionsMaterials: null,
    orderingInfo: null,
    fulfillmentNote: null,
    price: 10,
    imageUrl: null,
    isCustomizable: false,
    isSoldOut: false,
    fulfillmentType: "made_to_order",
    stockQuantity: null,
    cardBadge: null,
    categoryIds: ["cat-1"],
    primaryCategoryId: "cat-1",
    colorFields: [],
    personalizationFields: [],
    wishTemplateIds: [],
    optionGroups: [],
    metaTitle: null,
    metaDescription: null,
    ogTitle: null,
    ogDescription: null,
    ...overrides,
  };
}

test("buildProductMutationRpcPayload forwards wishTemplateIds as p_wish_template_ids", () => {
  const payload = buildProductMutationRpcPayload(
    minimalProductMutationInput({
      wishTemplateIds: ["wish-1", "wish-2"],
    }),
  );

  assert.deepEqual(payload.p_wish_template_ids, ["wish-1", "wish-2"]);
});

test("product edit form keeps ProductWishSelector wired to saved wish template ids", () => {
  const source = readSource("../components/admin/product-list-panel.tsx");

  assert.match(source, /ProductWishSelector/);
  assert.match(
    source,
    /wishTemplateIdsByProductId\.get\(product\.id\)\s*\?\?\s*\[\]/,
  );
});

test("product wish selector checkboxes submit admin wish_template_ids field name", () => {
  const source = readSource("../components/admin/product-wish-selector.tsx");

  assert.match(source, /name=\{adminFormFields\.product\.wishTemplateIds\}/);
  assert.equal(adminFormFields.product.wishTemplateIds, "wish_template_ids");
});

test("storefront add-to-cart shows wish picker only when field and product allow wishes", () => {
  const source = readSource("../components/product/product-detail-add-to-cart.tsx");

  assert.match(
    source,
    /field\.allowsWishTemplates[\s\S]*product\.wishTemplates\?\.length/,
  );
});
