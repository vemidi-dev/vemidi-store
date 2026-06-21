import assert from "node:assert/strict";
import test from "node:test";

import type { CartLine } from "@/lib/cart-types";
import {
  buildConfigurationIncomingFromCartLine,
  findCartLineForProduct,
  mergeProductConfigurationDraft,
  parseProductConfigurationDraft,
  resolveProductConfigurationDraft,
} from "@/lib/product-configuration-draft";

const PRODUCT_ID = "d594ddce-2fb5-49e0-859d-9ff91e752b9d";
const NAME_FIELD_ID = "name-field-id";

const personalizationFields = [{
  fieldId: NAME_FIELD_ID,
  fieldKey: "name",
  label: "Име",
  value: "Мария",
}];

const optionSelections = [
  { groupId: "size-group", valueIds: ["maxi"] },
  { groupId: "coloring-group", valueIds: ["markers"] },
];

const productFields = [{
  id: NAME_FIELD_ID,
  label: "Име",
  key: "name",
  type: "text" as const,
  placeholder: null,
  maxLength: 50,
  priceDelta: 2.5,
  required: false,
  allowsWishTemplates: false,
}];

function makeCartLine(
  overrides: Partial<CartLine> = {},
): CartLine {
  return {
    lineId: "line-1",
    productId: PRODUCT_ID,
    slug: "tvorcheski-komplekt-valshebni-peperudi",
    title: "Творчески комплект „Вълшебни пеперуди“",
    price: 26.5,
    quantity: 1,
    personalizationFields,
    optionSelections,
    ...overrides,
  };
}

test("checkout back restores personalization name from cart over empty localStorage draft", () => {
  const draft = resolveProductConfigurationDraft(
    null,
    makeCartLine(),
    productFields,
  );

  assert.equal(draft?.values[NAME_FIELD_ID], "Мария");
  assert.deepEqual(draft?.optionSelections, optionSelections);
  assert.ok(draft?.enabledOptionalFieldIds.includes(NAME_FIELD_ID));
});

test("checkout back keeps cart personalization when localStorage draft is stale", () => {
  const staleDraft = parseProductConfigurationDraft(JSON.stringify({
    values: { [NAME_FIELD_ID]: "" },
    enabledOptionalFieldIds: [],
    selectedColorOptionIdsByFieldId: {},
    optionSelections: [{ groupId: "size-group", valueIds: ["standard"] }],
  }));

  const draft = resolveProductConfigurationDraft(
    staleDraft,
    makeCartLine(),
    productFields,
  );

  assert.equal(draft?.values[NAME_FIELD_ID], "Мария");
  assert.deepEqual(
    draft?.optionSelections.find((selection) => selection.groupId === "size-group"),
    { groupId: "size-group", valueIds: ["maxi"] },
  );
});

test("checkout back maps legacy cart personalization string to the name field", () => {
  const incoming = buildConfigurationIncomingFromCartLine(
    makeCartLine({
      personalization: "Габи",
      personalizationFields: undefined,
    }),
    productFields,
  );

  const draft = mergeProductConfigurationDraft({
    values: {},
    enabledOptionalFieldIds: [],
    selectedColorOptionIdsByFieldId: {},
    optionSelections: [],
  }, incoming);

  assert.equal(draft.values[NAME_FIELD_ID], "Габи");
});

test("findCartLineForProduct prefers the cart line with the richest configuration", () => {
  const selected = findCartLineForProduct([
    makeCartLine({
      lineId: "empty",
      personalizationFields: undefined,
      optionSelections: undefined,
    }),
    makeCartLine({ lineId: "configured" }),
  ], PRODUCT_ID);

  assert.equal(
    (selected as CartLine | null)?.lineId,
    "configured",
  );
});

test("landing configurator to checkout back flow preserves size coloring and personalization", () => {
  const storedAfterLandingRedirect = parseProductConfigurationDraft(JSON.stringify({
    values: {},
    enabledOptionalFieldIds: [],
    selectedColorOptionIdsByFieldId: {},
    optionSelections: [{ groupId: "size-group", valueIds: ["standard"] }],
  }));

  const cartAfterHandoff = makeCartLine({
    price: 26.5,
    personalizationFields,
    optionSelections: [
      { groupId: "size-group", valueIds: ["maxi"] },
      { groupId: "coloring-group", valueIds: ["markers"] },
    ],
  });

  const restored = resolveProductConfigurationDraft(
    storedAfterLandingRedirect,
    cartAfterHandoff,
    productFields,
  );

  assert.equal(restored?.values[NAME_FIELD_ID], "Мария");
  assert.deepEqual(restored?.optionSelections, cartAfterHandoff.optionSelections);
  assert.equal(
    restored?.optionSelections.find((selection) => selection.groupId === "coloring-group")?.valueIds[0],
    "markers",
  );
});
