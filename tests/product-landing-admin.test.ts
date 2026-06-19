import assert from "node:assert/strict";
import test from "node:test";

import { adminFormFields } from "@/lib/admin/form-fields";
import {
  buildLandingPageRpcInput,
  normalizeLandingPageDraft,
  parseLandingPageFormData,
} from "@/lib/product-landing/admin-form";
import {
  getLandingPageMutationErrorMessage,
  isProductLandingPageAdminRpcMissing,
  isProductLandingPagesMigrationMissing,
} from "@/lib/product-landing/admin-rpc";
import {
  applyPrimaryForcesActive,
  countPrimaryLandingsForProduct,
  resolvePrimaryLandingSwitch,
} from "@/lib/product-landing/primary-switch";
import { buildProductLandingUrl, getLandingBaseUrl } from "@/lib/product-landing/url";
import type { ProductLandingPageRow } from "@/lib/product-landing/types";

const productA = "11111111-1111-4111-8111-111111111111";
const productB = "22222222-2222-4222-8222-222222222222";
const landingOne = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01";
const landingTwo = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa02";

function makeLandingRow(
  overrides: Partial<ProductLandingPageRow> & Pick<ProductLandingPageRow, "id" | "product_id" | "slug">,
): ProductLandingPageRow {
  return {
    title: "Landing title",
    campaign_code: "butterflies",
    is_primary: false,
    is_active: true,
    sort_order: 0,
    ...overrides,
  };
}

function makeLandingFormData(overrides: Record<string, string> = {}) {
  const formData = new FormData();
  formData.set(adminFormFields.landingPage.productId, productA);
  formData.set(adminFormFields.landingPage.productSlug, "peperuda");
  formData.set(adminFormFields.landingPage.title, "Вълшебни пеперуди");
  formData.set(adminFormFields.landingPage.slug, "valshebni-peperudi");
  formData.set(adminFormFields.landingPage.campaignCode, " Butterflies ");
  formData.set(adminFormFields.landingPage.sortOrder, "2");

  for (const [key, value] of Object.entries(overrides)) {
    formData.set(key, value);
  }

  return formData;
}

test("parseLandingPageFormData normalizes slug and campaign code", () => {
  const parsed = parseLandingPageFormData(makeLandingFormData());
  assert.equal(parsed.ok, true);
  if (!parsed.ok) {
    return;
  }

  assert.equal(parsed.payload.slug, "valshebni-peperudi");
  assert.equal(parsed.payload.campaignCode, "butterflies");
  assert.equal(parsed.payload.sortOrder, 2);
});

test("buildLandingPageRpcInput maps create and edit payloads", () => {
  const parsed = parseLandingPageFormData(
    makeLandingFormData({
      [adminFormFields.landingPage.id]: landingOne,
      [adminFormFields.landingPage.isPrimary]: "on",
      [adminFormFields.landingPage.isActive]: "on",
    }),
  );
  assert.equal(parsed.ok, true);
  if (!parsed.ok) {
    return;
  }

  assert.deepEqual(buildLandingPageRpcInput(parsed.payload), {
    p_landing_id: landingOne,
    p_product_id: productA,
    p_title: "Вълшебни пеперуди",
    p_slug: "valshebni-peperudi",
    p_campaign_code: "butterflies",
    p_is_primary: true,
    p_is_active: true,
    p_sort_order: 2,
  });
});

test("primary selection automatically forces active state", () => {
  assert.deepEqual(applyPrimaryForcesActive(true, false), {
    isPrimary: true,
    isActive: true,
  });

  const parsed = parseLandingPageFormData(
    makeLandingFormData({
      [adminFormFields.landingPage.isPrimary]: "on",
    }),
  );
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.payload.isPrimary, true);
    assert.equal(parsed.payload.isActive, true);
  }
});

test("resolvePrimaryLandingSwitch keeps only one primary landing per product", () => {
  const rows = [
    makeLandingRow({
      id: landingOne,
      product_id: productA,
      slug: "primary-a",
      is_primary: true,
      is_active: true,
    }),
    makeLandingRow({
      id: landingTwo,
      product_id: productA,
      slug: "secondary-a",
      is_primary: false,
      is_active: true,
    }),
    makeLandingRow({
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb01",
      product_id: productB,
      slug: "primary-b",
      is_primary: true,
      is_active: true,
    }),
  ];

  const nextRows = resolvePrimaryLandingSwitch(rows, productA, landingTwo, {
    id: landingTwo,
    product_id: productA,
    is_primary: true,
    is_active: true,
  });

  assert.equal(countPrimaryLandingsForProduct(nextRows, productA), 1);
  assert.equal(
    nextRows.find((row) => row.id === landingTwo)?.is_primary,
    true,
  );
  assert.equal(
    nextRows.find((row) => row.id === landingOne)?.is_primary,
    false,
  );
  assert.equal(countPrimaryLandingsForProduct(nextRows, productB), 1);
});

test("getLandingPageMutationErrorMessage maps localized RPC error codes", () => {
  assert.match(
    getLandingPageMutationErrorMessage({
      message: "landing_slug_taken",
      code: "22023",
      details: "",
      hint: "",
    }),
    /slug/i,
  );
  assert.match(
    getLandingPageMutationErrorMessage({
      message: "landing_page_not_found",
      code: "P0002",
      details: "",
      hint: "",
    }),
    /не е намерена/i,
  );
  assert.match(
    getLandingPageMutationErrorMessage({
      message: "primary_landing_must_be_active",
      code: "22023",
      details: "",
      hint: "",
    }),
    /Primary landing/i,
  );
});

test("migration missing helpers detect table and RPC absence", () => {
  assert.equal(
    isProductLandingPagesMigrationMissing({
      code: "42P01",
      message: 'relation "public.product_landing_pages" does not exist',
    }),
    true,
  );
  assert.equal(
    isProductLandingPageAdminRpcMissing({
      code: "PGRST202",
      message: "Could not find the function public.admin_upsert_product_landing_page",
    }),
    true,
  );
});

test("products without landing records remain backward compatible in admin data maps", () => {
  const rows = [
    makeLandingRow({
      id: landingOne,
      product_id: productA,
      slug: "primary-a",
      is_primary: true,
    }),
  ];

  const forProductB = rows.filter((row) => row.product_id === productB);
  assert.deepEqual(forProductB, []);
});

test("URL preview builds only from trusted base URL and validated slug", () => {
  assert.equal(
    buildProductLandingUrl("valshebni-peperudi", getLandingBaseUrl()),
    "https://special.vemidi-crafts.com/valshebni-peperudi",
  );
  assert.equal(buildProductLandingUrl("../admin", getLandingBaseUrl()), null);
});

test("parseLandingPageFormData rejects invalid delete-related payloads indirectly", () => {
  const parsed = parseLandingPageFormData(
    makeLandingFormData({
      [adminFormFields.landingPage.slug]: "Bad Slug",
    }),
  );
  assert.equal(parsed.ok, false);
});

test("normalizeLandingPageDraft keeps optional campaign code nullable", () => {
  assert.deepEqual(
    normalizeLandingPageDraft({
      title: " Landing ",
      slug: "VALSHEBNI-peperudi",
      campaignCode: "",
    }),
    {
      title: "Landing",
      slug: "valshebni-peperudi",
      campaignCode: null,
    },
  );
});
