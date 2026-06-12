import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCampaignAttribution,
  normalizeCampaignCode,
  normalizeCampaignSource,
  normalizeLandingUrl,
  resolveCampaignSource,
  resolveOrderAttributionFromLines,
  STORE_ORDER_SOURCE,
} from "@/lib/campaign-attribution";

test("campaign codes are normalized for URLs and order attribution", () => {
  assert.equal(normalizeCampaignCode("  Butterflies Summer  "), "butterflies-summer");
  assert.equal(normalizeCampaignCode("Кампания Пеперуди 2026"), "кампания-пеперуди-2026");
  assert.equal(normalizeCampaignCode(" !!! "), undefined);
  assert.equal(normalizeCampaignCode(null), undefined);
});

test("campaign source values are allowlisted and derived from campaign slug", () => {
  assert.equal(normalizeCampaignSource("Campaign-Butterflies"), "campaign-butterflies");
  assert.equal(normalizeCampaignSource(STORE_ORDER_SOURCE), undefined);
  assert.equal(resolveCampaignSource(undefined, "butterflies"), "campaign-butterflies");
});

test("landing urls are restricted to approved hosts without credentials", () => {
  assert.equal(
    normalizeLandingUrl("https://special.vemidi-crafts.com/valshebni-peperudi"),
    "https://special.vemidi-crafts.com/valshebni-peperudi",
  );
  assert.equal(normalizeLandingUrl("https://evil.example/phish"), undefined);
  assert.equal(normalizeLandingUrl("javascript:alert(1)"), undefined);
});

test("store orders without campaign metadata keep default source", () => {
  const attribution = resolveOrderAttributionFromLines([{}]);

  assert.equal(attribution, undefined);
});

test("order attribution merges cart line campaign metadata", () => {
  const attribution = resolveOrderAttributionFromLines([
    {
      campaign: "butterflies",
      source: "campaign-butterflies",
      landingUrl: "https://special.vemidi-crafts.com/valshebni-peperudi",
    },
  ]);

  assert.deepEqual(
    buildCampaignAttribution({
      campaign: "butterflies",
      source: "campaign-butterflies",
      landingUrl: "https://special.vemidi-crafts.com/valshebni-peperudi",
    }),
    attribution,
  );
});
