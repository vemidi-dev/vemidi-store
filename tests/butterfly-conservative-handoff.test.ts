import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateCampaignHandoff,
  getCampaignProductPageOptionSelections,
  parseCampaignHandoffQuery,
} from "@/lib/campaign-handoff";
import { getVisibleOptionGroups } from "@/lib/product-options";
import {
  calculateEstimatedUnitPrice,
  calculateOptionDelta,
} from "@/lib/product-option-pricing";
import { validateProductOptionSelections } from "@/lib/product-option-validation";
import {
  BUTTERFLY_BASE_PRICE,
  BUTTERFLY_LANDING_URL,
  BUTTERFLY_PRODUCT_ID,
  BUTTERFLY_PRODUCT_SLUG,
  butterflyConservativeProduct,
  butterflyLandingHandoffQuery,
  groupChildNameId,
  groupColoringId,
  groupPersonalizationId,
  groupRazmerId,
  valueMarkersId,
  valueMiniId,
  valuePaintsId,
  valuePersonalizationNoId,
  valuePersonalizationYesId,
} from "@/tests/fixtures/butterfly-conservative-handoff";

const landingSizeColorNo = {
  ...butterflyLandingHandoffQuery,
  option_razmer_na_komplekta: "komplekt_mini_1_peperuda_2_vodni_koncheta",
  option_coloring: "paints",
  option_personalization: "no",
} as const;

const landingSizeColorYes = {
  ...butterflyLandingHandoffQuery,
  option_razmer_na_komplekta: "komplekt_mini_1_peperuda_2_vodni_koncheta",
  option_coloring: "markers",
  option_personalization: "yes",
} as const;

test("conservative butterfly: personalization=no does not require child_name", () => {
  const visible = getVisibleOptionGroups(
    butterflyConservativeProduct.optionGroups!,
    [
      { groupId: groupRazmerId, valueIds: [valueMiniId] },
      { groupId: groupColoringId, valueIds: [valuePaintsId] },
      { groupId: groupPersonalizationId, valueIds: [valuePersonalizationNoId] },
    ],
  );

  assert.equal(
    visible.some((group) => group.id === groupChildNameId),
    false,
  );

  const validation = validateProductOptionSelections(
    BUTTERFLY_PRODUCT_ID,
    butterflyConservativeProduct.optionGroups!,
    [
      { groupId: groupRazmerId, valueIds: [valueMiniId] },
      { groupId: groupColoringId, valueIds: [valuePaintsId] },
      { groupId: groupPersonalizationId, valueIds: [valuePersonalizationNoId] },
    ],
  );
  assert.equal(validation.ok, true);
});

test("conservative butterfly: size + coloring + personalization=no handoff is ready", () => {
  const query = parseCampaignHandoffQuery(landingSizeColorNo);
  const result = evaluateCampaignHandoff(butterflyConservativeProduct, query);

  assert.equal(result.status, "ready");
  if (result.status !== "ready") {
    return;
  }

  assert.equal(result.product.id, BUTTERFLY_PRODUCT_ID);
  assert.equal(result.attribution.campaign, "butterflies");
  assert.equal(result.attribution.source, "campaign-butterflies");
  assert.equal(result.attribution.landingUrl, BUTTERFLY_LANDING_URL);
  assert.ok(result.optionSelections?.every((selection) => !selection.textValue));
});

test("conservative butterfly: personalization=yes without child_name needs_configuration", () => {
  const query = parseCampaignHandoffQuery(landingSizeColorYes);
  const result = evaluateCampaignHandoff(butterflyConservativeProduct, query);

  assert.equal(result.status, "needs_configuration");
  if (result.status !== "needs_configuration") {
    return;
  }

  assert.ok(result.missing.includes("универсални опции"));
});

test("conservative butterfly: redirect targets canonical produkti slug with attribution", () => {
  const query = parseCampaignHandoffQuery(landingSizeColorYes);
  const result = evaluateCampaignHandoff(butterflyConservativeProduct, query);

  assert.equal(result.status, "needs_configuration");
  if (result.status !== "needs_configuration") {
    return;
  }

  const redirect = new URL(result.redirectPath, "https://vemidi-crafts.com");
  assert.equal(redirect.pathname, `/produkti/${BUTTERFLY_PRODUCT_SLUG}`);
  assert.equal(redirect.searchParams.get("campaign"), "butterflies");
  assert.equal(redirect.searchParams.get("source"), "campaign-butterflies");
  assert.equal(redirect.searchParams.get("landing"), BUTTERFLY_LANDING_URL);
  assert.equal(
    redirect.searchParams.get(`opt_${groupRazmerId}`),
    valueMiniId,
  );
  assert.equal(
    redirect.searchParams.get(`opt_${groupColoringId}`),
    valueMarkersId,
  );
  assert.equal(
    redirect.searchParams.get(`opt_${groupPersonalizationId}`),
    valuePersonalizationYesId,
  );
});

test("conservative butterfly: redirect never contains PII query keys or values", () => {
  const query = parseCampaignHandoffQuery(landingSizeColorYes);
  const result = evaluateCampaignHandoff(butterflyConservativeProduct, query);

  assert.equal(result.status, "needs_configuration");
  if (result.status !== "needs_configuration") {
    return;
  }

  const redirect = result.redirectPath.toLowerCase();
  assert.doesNotMatch(redirect, /child_name/);
  assert.doesNotMatch(redirect, /option_text_/);
  assert.doesNotMatch(redirect, /pf_/);
  assert.doesNotMatch(redirect, /мария|maria|name=/);
});

test("conservative butterfly: store-side yes + valid child_name handoff is ready", () => {
  const query = parseCampaignHandoffQuery({
    ...landingSizeColorYes,
    option_text_child_name: encodeURIComponent("Алекс"),
  });
  const result = evaluateCampaignHandoff(butterflyConservativeProduct, query);

  assert.equal(result.status, "ready");
  if (result.status !== "ready") {
    return;
  }

  const childName = result.optionSelections?.find(
    (selection) => selection.groupId === groupChildNameId,
  );
  assert.equal(childName?.textValue, "Алекс");
});

test("conservative butterfly: product page preselects non-personal campaign options only", () => {
  const selections = getCampaignProductPageOptionSelections(
    butterflyConservativeProduct,
    landingSizeColorYes,
  );

  assert.deepEqual(selections, [
    { groupId: groupRazmerId, valueIds: [valueMiniId] },
    { groupId: groupColoringId, valueIds: [valueMarkersId] },
    { groupId: groupPersonalizationId, valueIds: [valuePersonalizationYesId] },
  ]);
  assert.equal(
    selections.some((selection) => selection.groupId === groupChildNameId),
    false,
  );
});

test("conservative butterfly: paints and markers have zero option delta", () => {
  const paintsDelta = calculateOptionDelta(butterflyConservativeProduct.optionGroups!, [
    { groupId: groupRazmerId, valueIds: [valueMiniId] },
    { groupId: groupColoringId, valueIds: [valuePaintsId] },
    { groupId: groupPersonalizationId, valueIds: [valuePersonalizationNoId] },
  ]);
  const markersDelta = calculateOptionDelta(butterflyConservativeProduct.optionGroups!, [
    { groupId: groupRazmerId, valueIds: [valueMiniId] },
    { groupId: groupColoringId, valueIds: [valueMarkersId] },
    { groupId: groupPersonalizationId, valueIds: [valuePersonalizationNoId] },
  ]);

  assert.equal(paintsDelta, 0);
  assert.equal(markersDelta, 0);
  assert.equal(paintsDelta, markersDelta);
});

test("conservative butterfly: personalization=yes adds only 2.50 server-side", () => {
  const withoutPersonalization = calculateEstimatedUnitPrice(
    BUTTERFLY_BASE_PRICE,
    butterflyConservativeProduct.optionGroups!,
    [
      { groupId: groupRazmerId, valueIds: [valueMiniId] },
      { groupId: groupColoringId, valueIds: [valuePaintsId] },
      { groupId: groupPersonalizationId, valueIds: [valuePersonalizationNoId] },
    ],
  );
  const withPersonalization = calculateEstimatedUnitPrice(
    BUTTERFLY_BASE_PRICE,
    butterflyConservativeProduct.optionGroups!,
    [
      { groupId: groupRazmerId, valueIds: [valueMiniId] },
      { groupId: groupColoringId, valueIds: [valuePaintsId] },
      { groupId: groupPersonalizationId, valueIds: [valuePersonalizationYesId] },
      { groupId: groupChildNameId, valueIds: [], textValue: "Алекс" },
    ],
  );

  assert.equal(withoutPersonalization, BUTTERFLY_BASE_PRICE);
  assert.equal(withPersonalization, BUTTERFLY_BASE_PRICE + 2.5);
});

test("conservative butterfly: unknown option keys are rejected", () => {
  const query = parseCampaignHandoffQuery({
    ...landingSizeColorNo,
    option_kit_size: "mini",
  });
  const result = evaluateCampaignHandoff(butterflyConservativeProduct, query);

  assert.equal(result.status, "invalid");
  if (result.status === "invalid") {
    assert.match(result.message, /Непозната група опции/i);
  }
});
