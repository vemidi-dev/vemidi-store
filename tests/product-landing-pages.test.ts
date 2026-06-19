import assert from "node:assert/strict";
import test from "node:test";

import {
  selectPrimaryActiveLandingPage,
  toProductLandingPage,
} from "@/lib/product-landing/repository";
import type { ProductLandingPageRow } from "@/lib/product-landing/types";
import {
  buildProductLandingUrl,
  FALLBACK_LANDING_BASE_URL,
  getLandingBaseUrl,
} from "@/lib/product-landing/url";
import {
  normalizeLandingCampaignCode,
  normalizeLandingSlug,
  validateLandingCampaignCode,
  validateLandingSlug,
} from "@/lib/product-landing/validation";

const productA = "11111111-1111-4111-8111-111111111111";
const productB = "22222222-2222-4222-8222-222222222222";
const landingBaseUrl = new URL(FALLBACK_LANDING_BASE_URL);

function makeLandingRow(
  overrides: Partial<ProductLandingPageRow> & Pick<ProductLandingPageRow, "product_id" | "slug">,
): ProductLandingPageRow {
  return {
    id: "33333333-3333-4333-8333-333333333333",
    title: "Landing title",
    campaign_code: "butterflies",
    is_primary: true,
    is_active: true,
    sort_order: 0,
    ...overrides,
  };
}

test("buildProductLandingUrl returns an absolute landing URL for a valid slug", () => {
  assert.equal(
    buildProductLandingUrl("valshebni-peperudi", landingBaseUrl),
    "https://special.vemidi-crafts.com/valshebni-peperudi",
  );
});

test("buildProductLandingUrl rejects invalid slug values", () => {
  assert.equal(buildProductLandingUrl("", landingBaseUrl), null);
  assert.equal(
    buildProductLandingUrl("11111111-1111-4111-8111-111111111111", landingBaseUrl),
    null,
  );
  assert.equal(buildProductLandingUrl("../admin", landingBaseUrl), null);
  assert.equal(
    buildProductLandingUrl("https://evil.example/phish", landingBaseUrl),
    null,
  );
  assert.equal(buildProductLandingUrl("slug with spaces", landingBaseUrl), null);
  assert.equal(buildProductLandingUrl("trailing-slash/", landingBaseUrl), null);
});

test("getLandingBaseUrl ignores untrusted configured hosts", () => {
  assert.equal(
    getLandingBaseUrl("https://evil.example/").origin,
    FALLBACK_LANDING_BASE_URL,
  );
  assert.equal(
    getLandingBaseUrl("https://special.vemidi-crafts.com/campaigns").origin,
    "https://special.vemidi-crafts.com",
  );
});

test("validateLandingSlug and normalizeLandingSlug accept safe lowercase slugs", () => {
  const validation = validateLandingSlug("valshebni-peperudi");
  assert.equal(validation.ok, true);
  assert.equal(normalizeLandingSlug("valshebni-peperudi"), "valshebni-peperudi");
});

test("validateLandingCampaignCode accepts optional campaign codes", () => {
  assert.deepEqual(validateLandingCampaignCode(""), { ok: true, campaignCode: null });
  assert.equal(normalizeLandingCampaignCode(" Butterflies "), "butterflies");
  assert.equal(normalizeLandingCampaignCode("!!!"), null);
});

test("selectPrimaryActiveLandingPage returns only active primary landing rows", () => {
  const rows = [
    makeLandingRow({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01",
      product_id: productA,
      slug: "inactive-primary",
      is_primary: true,
      is_active: false,
    }),
    makeLandingRow({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa02",
      product_id: productA,
      slug: "active-primary",
      is_primary: true,
      is_active: true,
      sort_order: 1,
    }),
    makeLandingRow({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa03",
      product_id: productA,
      slug: "active-secondary",
      is_primary: false,
      is_active: true,
    }),
  ];

  const landing = selectPrimaryActiveLandingPage(rows, productA);
  assert.ok(landing);
  assert.equal(landing.slug, "active-primary");
  assert.equal(landing.isPrimary, true);
  assert.equal(landing.isActive, true);
});

test("selectPrimaryActiveLandingPage returns null when no landing exists", () => {
  assert.equal(selectPrimaryActiveLandingPage([], productA), null);
  assert.equal(
    selectPrimaryActiveLandingPage(
      [
        makeLandingRow({
          product_id: productA,
          slug: "inactive-only",
          is_primary: true,
          is_active: false,
        }),
      ],
      productA,
    ),
    null,
  );
});

test("different products can have different primary landing records", () => {
  const rows = [
    makeLandingRow({
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb01",
      product_id: productA,
      slug: "product-a-landing",
      is_primary: true,
      is_active: true,
    }),
    makeLandingRow({
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb02",
      product_id: productB,
      slug: "product-b-landing",
      is_primary: true,
      is_active: true,
    }),
  ];

  const landingA = selectPrimaryActiveLandingPage(rows, productA);
  const landingB = selectPrimaryActiveLandingPage(rows, productB);

  assert.equal(landingA?.slug, "product-a-landing");
  assert.equal(landingB?.slug, "product-b-landing");
});

test("products without landing records remain backward compatible", () => {
  const rows = [
    makeLandingRow({
      product_id: productA,
      slug: "existing-landing",
      is_primary: true,
      is_active: true,
    }),
  ];

  assert.equal(selectPrimaryActiveLandingPage(rows, productB), null);
  assert.equal(toProductLandingPage(rows[0]!).productId, productA);
});
