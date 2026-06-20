import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateCampaignHandoff,
  getCampaignProductPageOptionSelections,
  parseCampaignHandoffQuery,
} from "@/lib/campaign-handoff";
import {
  calculateEstimatedUnitPrice,
  calculateOptionDelta,
} from "@/lib/product-option-pricing";
import { calculatePersonalizationDelta } from "@/lib/product-personalization";
import { validateProductOptionSelections } from "@/lib/product-option-validation";
import {
  BUTTERFLY_BASE_PRICE,
  BUTTERFLY_LANDING_URL,
  BUTTERFLY_LEGACY_PERSONALIZATION_FIELD_KEY,
  BUTTERFLY_PRODUCT_ID,
  BUTTERFLY_PRODUCT_SLUG,
  butterflyConservativeProduct,
  butterflyLandingHandoffQuery,
  butterflyLegacyPersonalizationFieldId,
  butterflyPostHandoffFields,
  butterflyPostHandoffWithNameFields,
  groupColoringId,
  groupRazmerId,
  valueMarkersId,
  valueMiniId,
  valuePaintsId,
} from "@/tests/fixtures/butterfly-conservative-handoff";

const landingSizeColor = {
  ...butterflyLandingHandoffQuery,
  option_razmer_na_komplekta: "komplekt_mini_1_peperuda_2_vodni_koncheta",
  option_coloring: "paints",
} as const;

const landingSizeColorWithLegacyName = {
  ...landingSizeColor,
  [`pf_${BUTTERFLY_LEGACY_PERSONALIZATION_FIELD_KEY}`]: "Мария",
} as const;

test("conservative butterfly: size + coloring without personalization is ready", () => {
  const query = parseCampaignHandoffQuery(landingSizeColor);
  const result = evaluateCampaignHandoff(butterflyConservativeProduct, query);

  assert.equal(result.status, "ready");
  if (result.status !== "ready") {
    return;
  }

  assert.equal(result.product.id, BUTTERFLY_PRODUCT_ID);
  assert.equal(result.attribution.campaign, "butterflies");
  assert.equal(result.attribution.source, "campaign-butterflies");
  assert.equal(result.attribution.landingUrl, BUTTERFLY_LANDING_URL);
  assert.equal(result.personalizationFields, undefined);
  assert.ok(result.optionSelections?.every((selection) => !selection.textValue));
});

test("conservative butterfly: legacy pf field with name is ready for direct checkout", () => {
  const query = parseCampaignHandoffQuery(landingSizeColorWithLegacyName);
  const result = evaluateCampaignHandoff(butterflyConservativeProduct, query);

  assert.equal(result.status, "ready");
  if (result.status !== "ready") {
    return;
  }

  assert.equal(result.personalizationFields?.length, 1);
  assert.equal(result.personalizationFields?.[0]?.fieldId, butterflyLegacyPersonalizationFieldId);
  assert.equal(result.personalizationFields?.[0]?.value, "Мария");
});

test("conservative butterfly: handoff URL never contains PII query keys or values", () => {
  const query = parseCampaignHandoffQuery(landingSizeColorWithLegacyName);
  const result = evaluateCampaignHandoff(butterflyConservativeProduct, query);

  assert.equal(result.status, "ready");
  const serialized = JSON.stringify(result).toLowerCase();
  assert.doesNotMatch(serialized, /option_text_/);
  assert.doesNotMatch(serialized, /child_name/);
});

test("conservative butterfly: product page preselects campaign options only", () => {
  const selections = getCampaignProductPageOptionSelections(
    butterflyConservativeProduct,
    landingSizeColorWithLegacyName,
  );

  assert.deepEqual(selections, [
    { groupId: groupRazmerId, valueIds: [valueMiniId] },
    { groupId: groupColoringId, valueIds: [valuePaintsId] },
  ]);
});

test("conservative butterfly: paints and markers have zero option delta", () => {
  const paintsDelta = calculateOptionDelta(butterflyConservativeProduct.optionGroups!, [
    { groupId: groupRazmerId, valueIds: [valueMiniId] },
    { groupId: groupColoringId, valueIds: [valuePaintsId] },
  ]);
  const markersDelta = calculateOptionDelta(butterflyConservativeProduct.optionGroups!, [
    { groupId: groupRazmerId, valueIds: [valueMiniId] },
    { groupId: groupColoringId, valueIds: [valueMarkersId] },
  ]);

  assert.equal(paintsDelta, 0);
  assert.equal(markersDelta, 0);
});

test("conservative butterfly: legacy personalization adds only 2.50 server-side", () => {
  const optionSelections = [
    { groupId: groupRazmerId, valueIds: [valueMiniId] },
    { groupId: groupColoringId, valueIds: [valuePaintsId] },
  ];
  const withoutPersonalization =
    BUTTERFLY_BASE_PRICE +
    calculateOptionDelta(butterflyConservativeProduct.optionGroups!, optionSelections) +
    calculatePersonalizationDelta(butterflyConservativeProduct.personalizationFields!, []);
  const withPersonalization =
    BUTTERFLY_BASE_PRICE +
    calculateOptionDelta(butterflyConservativeProduct.optionGroups!, optionSelections) +
    calculatePersonalizationDelta(butterflyConservativeProduct.personalizationFields!, [
      {
        fieldId: butterflyLegacyPersonalizationFieldId,
        fieldKey: BUTTERFLY_LEGACY_PERSONALIZATION_FIELD_KEY,
        label: "Име или кратък текст на табелката",
        value: "Мария",
      },
    ]);

  assert.equal(
    calculateEstimatedUnitPrice(
      BUTTERFLY_BASE_PRICE,
      butterflyConservativeProduct.optionGroups!,
      optionSelections,
    ),
    BUTTERFLY_BASE_PRICE,
  );
  assert.equal(withoutPersonalization, BUTTERFLY_BASE_PRICE);
  assert.equal(withPersonalization, BUTTERFLY_BASE_PRICE + 2.5);
});

test("conservative butterfly: required size and coloring validate together", () => {
  const validation = validateProductOptionSelections(
    BUTTERFLY_PRODUCT_ID,
    butterflyConservativeProduct.optionGroups!,
    [
      { groupId: groupRazmerId, valueIds: [valueMiniId] },
      { groupId: groupColoringId, valueIds: [valuePaintsId] },
    ],
  );
  assert.equal(validation.ok, true);
});

test("conservative butterfly: unknown option keys are rejected", () => {
  const query = parseCampaignHandoffQuery({
    ...landingSizeColor,
    option_kit_size: "mini",
  });
  const result = evaluateCampaignHandoff(butterflyConservativeProduct, query);

  assert.equal(result.status, "invalid");
  if (result.status === "invalid") {
    assert.match(result.message, /Непозната група опции/i);
  }
});

test("conservative butterfly: POST field fixtures map to ready handoff", () => {
  const withoutName = parseCampaignHandoffQuery(butterflyPostHandoffFields);
  const withName = parseCampaignHandoffQuery(butterflyPostHandoffWithNameFields);

  assert.equal(
    evaluateCampaignHandoff(butterflyConservativeProduct, withoutName).status,
    "ready",
  );
  assert.equal(
    evaluateCampaignHandoff(butterflyConservativeProduct, withName).status,
    "ready",
  );
});

test("conservative butterfly: missing size needs configuration redirect to produkti slug", () => {
  const query = parseCampaignHandoffQuery({
    ...butterflyLandingHandoffQuery,
    option_coloring: "paints",
  });
  const result = evaluateCampaignHandoff(butterflyConservativeProduct, query);

  assert.equal(result.status, "needs_configuration");
  if (result.status !== "needs_configuration") {
    return;
  }

  const redirect = new URL(result.redirectPath, "https://vemidi-crafts.com");
  assert.equal(redirect.pathname, `/produkti/${BUTTERFLY_PRODUCT_SLUG}`);
  assert.equal(redirect.searchParams.get("campaign"), "butterflies");
});
