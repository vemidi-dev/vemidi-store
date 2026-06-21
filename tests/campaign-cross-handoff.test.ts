import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";

import {
  ALLOWED_CROSS_HANDOFF_FIELD_KEYS,
  CROSS_HANDOFF_DIRECTION,
  mapCrossHandoffFieldsToFormState,
  openCrossHandoffPayload,
  sealCrossHandoffPayload,
  validateCrossHandoffFormState,
} from "@/lib/campaign-cross-handoff";
import { CROSS_HANDOFF_PERSONALIZATION_POST_KEY } from "@/lib/campaign-landing-handoff-client";
import {
  buildCrossHandoffClearCookieHeader,
  buildCrossHandoffSetCookieHeader,
  CROSS_HANDOFF_COOKIE_DOMAIN,
  CROSS_HANDOFF_COOKIE_NAME,
  resolveCrossHandoffCookieScope,
} from "@/lib/campaign-cross-handoff-cookie-config";
import {
  buildLandingHandoffPostFieldsFromDraft,
  parseLandingHandoffPostBody,
  validateStoreToLandingHandoff,
} from "@/lib/campaign-landing-handoff";
import {
  handleCampaignLandingHandoffConsumeGet,
  handleCampaignLandingHandoffPost,
} from "@/lib/campaign-landing-handoff-request";
import { LANDING_HANDOFF_POST_CONTENT_TYPE } from "@/lib/campaign-landing-handoff";
import {
  BUTTERFLY_LEGACY_PERSONALIZATION_FIELD_KEY,
  butterflyConservativeProduct,
  butterflyLegacyPersonalizationFieldId,
  groupColoringId,
  groupRazmerId,
  valueMarkersId,
  valueMaxiId,
  valueMiniId,
  valuePaintsId,
  BUTTERFLY_PRODUCT_ID,
} from "@/tests/fixtures/butterfly-conservative-handoff";

const TEST_SECRET = "test-cross-handoff-secret";
const PREVIEW_LANDING = "http://localhost:3001";

function encodeFormBody(fields: Record<string, string>) {
  return new URLSearchParams(fields).toString();
}

function buildIssueRequest(
  fields: Record<string, string>,
  host = "vemidi-crafts.com",
) {
  return new Request("https://vemidi-crafts.com/api/campaign-landing-handoff", {
    method: "POST",
    headers: {
      "content-type": LANDING_HANDOFF_POST_CONTENT_TYPE,
      referer: `https://${host}/produkti/tvorcheski-komplekt-valshebni-peperudi`,
      "x-forwarded-host": host,
      "x-forwarded-proto": "https",
    },
    body: encodeFormBody(fields),
  });
}

function buildConsumeRequest(cookie: string, origin = PREVIEW_LANDING) {
  return new Request("https://vemidi-crafts.com/api/campaign-landing-handoff/consume", {
    method: "GET",
    headers: {
      origin,
      cookie: `${CROSS_HANDOFF_COOKIE_NAME}=${cookie}`,
      "x-forwarded-host": "vemidi-crafts.com",
      "x-forwarded-proto": "https",
    },
  });
}

function miniFields(extra: Record<string, string> = {}) {
  return {
    product: BUTTERFLY_PRODUCT_ID,
    landingSlug: "valshebni-peperudi",
    option_razmer_na_komplekta: "komplekt_mini_1_peperuda_2_vodni_koncheta",
    option_coloring: "paints",
    ...extra,
  };
}

beforeEach(() => {
  process.env.CAMPAIGN_HANDOFF_SECRET = TEST_SECRET;
  process.env.CAMPAIGN_HANDOFF_ALLOWED_ORIGINS = PREVIEW_LANDING;
  process.env.NEXT_PUBLIC_LANDING_BASE_URL = "https://special.vemidi-crafts.com";
});

afterEach(() => {
  delete process.env.CAMPAIGN_HANDOFF_SECRET;
  delete process.env.CAMPAIGN_HANDOFF_ALLOWED_ORIGINS;
  delete process.env.NEXT_PUBLIC_LANDING_BASE_URL;
});

test("cross-handoff: seal/open roundtrip preserves v2 payload", () => {
  const fields = {
    option_razmer_na_komplekta: "komplekt_standart_2_peperuda_3_vodni_koncheta",
    option_coloring: "markers",
  };

  const sealed = sealCrossHandoffPayload(
    {
      productId: BUTTERFLY_PRODUCT_ID,
      landingSlug: "valshebni-peperudi",
      campaign: "butterflies",
      fields,
    },
    TEST_SECRET,
  );

  const opened = openCrossHandoffPayload(sealed, TEST_SECRET);
  assert.equal(opened.ok, true);
  if (!opened.ok) return;

  assert.equal(opened.payload.dir, CROSS_HANDOFF_DIRECTION);
  assert.equal(opened.payload.productId, BUTTERFLY_PRODUCT_ID);
  assert.deepEqual(opened.payload.fields, fields);
});

test("cross-handoff: maps mini/standard/maxi and coloring to landing form state", () => {
  const cases = [
    ["komplekt_mini_1_peperuda_2_vodni_koncheta", "3"],
    ["komplekt_standart_2_peperuda_3_vodni_koncheta", "5"],
    ["komplekt_maksi_3_peperuda_4_vodni_koncheta", "7"],
  ] as const;

  for (const [storeKey, landingSize] of cases) {
    const formState = mapCrossHandoffFieldsToFormState({
      option_razmer_na_komplekta: storeKey,
      option_coloring: "paints",
    });
    assert.ok(formState);
    assert.equal(formState?.size, landingSize);
    assert.equal(formState?.coloring, "paints");
    assert.equal(formState?.personalize, false);
  }

  const withName = mapCrossHandoffFieldsToFormState({
    option_razmer_na_komplekta: "komplekt_maksi_3_peperuda_4_vodni_koncheta",
    option_coloring: "markers",
    [CROSS_HANDOFF_PERSONALIZATION_POST_KEY]: "Мария",
  });
  assert.ok(withName);
  assert.equal(withName?.personalize, true);
  assert.equal(withName?.personalizationName, "Мария");
  assert.ok(validateCrossHandoffFormState(withName!));
});

test("cross-handoff: rejects tampered, expired, and wrong direction payloads", () => {
  const crossFields = {
    option_razmer_na_komplekta: "komplekt_mini_1_peperuda_2_vodni_koncheta",
    option_coloring: "paints",
  };

  const sealed = sealCrossHandoffPayload(
    {
      productId: BUTTERFLY_PRODUCT_ID,
      landingSlug: "valshebni-peperudi",
      campaign: "butterflies",
      fields: crossFields,
    },
    TEST_SECRET,
    Date.now() - 400_000,
  );

  assert.equal(openCrossHandoffPayload(sealed, TEST_SECRET).ok, false);
  assert.equal(openCrossHandoffPayload(`${sealed}x`, TEST_SECRET).ok, false);
  assert.equal(openCrossHandoffPayload(sealed, "wrong-secret").ok, false);
});

test("cross-handoff: production cookie uses parent domain attributes", () => {
  const scope = resolveCrossHandoffCookieScope("vemidi-crafts.com");
  const setCookie = buildCrossHandoffSetCookieHeader("abc", true, scope);
  const clearCookie = buildCrossHandoffClearCookieHeader(true, scope);

  assert.match(setCookie, new RegExp(`${CROSS_HANDOFF_COOKIE_NAME}=abc`));
  assert.match(setCookie, /Domain=\.vemidi-crafts\.com/);
  assert.match(setCookie, /HttpOnly/);
  assert.match(setCookie, /Secure/);
  assert.match(setCookie, /SameSite=Lax/);
  assert.match(setCookie, /Max-Age=300/);

  assert.match(clearCookie, /Max-Age=0/);
  assert.match(clearCookie, new RegExp(`Domain=${CROSS_HANDOFF_COOKIE_DOMAIN}`));
});

test("landing handoff POST: redirect URL has no PII or option params", async () => {
  const fields = miniFields({
    [CROSS_HANDOFF_PERSONALIZATION_POST_KEY]: "Мария",
  });

  const response = await handleCampaignLandingHandoffPost(buildIssueRequest(fields), {
    getProduct: async () => butterflyConservativeProduct,
  });

  assert.equal(response.status, 303);
  const location = response.headers.get("location") ?? "";
  assert.equal(location, "https://special.vemidi-crafts.com/valshebni-peperudi");
  assert.doesNotMatch(location, /мария|pf_|option_|personal/i);
  assert.ok(response.headers.get("set-cookie")?.includes(CROSS_HANDOFF_COOKIE_NAME));
});

test("landing handoff POST: rejects blocked price field and unknown options", async () => {
  const priceResponse = await handleCampaignLandingHandoffPost(
    buildIssueRequest({ ...miniFields(), price: "9.99" }),
    { getProduct: async () => butterflyConservativeProduct },
  );
  assert.equal(priceResponse.status, 400);

  const invalidOption = await handleCampaignLandingHandoffPost(
    buildIssueRequest({
      ...miniFields(),
      option_razmer_na_komplekta: "unknown_size_key",
    }),
    { getProduct: async () => butterflyConservativeProduct },
  );
  assert.equal(invalidOption.status, 400);
});

test("landing handoff POST: rejects invalid landing slug", () => {
  const parsed = parseLandingHandoffPostBody(
    new URLSearchParams({
      ...miniFields(),
      landingSlug: "../../evil",
    }),
  );
  assert.equal(parsed.ok, false);
});

test("landing handoff consume: preview CORS returns formState and clears cookie", async () => {
  const issue = await handleCampaignLandingHandoffPost(buildIssueRequest(miniFields()), {
    getProduct: async () => butterflyConservativeProduct,
  });
  const setCookie = issue.headers.get("set-cookie") ?? "";
  const sealed = setCookie.match(new RegExp(`${CROSS_HANDOFF_COOKIE_NAME}=([^;]+)`))?.[1];
  assert.ok(sealed);

  const consume = await handleCampaignLandingHandoffConsumeGet(
    buildConsumeRequest(decodeURIComponent(sealed!)),
  );
  assert.equal(consume.status, 200);
  assert.equal(consume.headers.get("access-control-allow-origin"), PREVIEW_LANDING);
  assert.equal(consume.headers.get("access-control-allow-credentials"), "true");

  const body = (await consume.json()) as { ok: boolean; formState: { size: string } };
  assert.equal(body.ok, true);
  assert.equal(body.formState.size, "3");
  assert.match(consume.headers.get("set-cookie") ?? "", /Max-Age=0/);
});

test("landing handoff consume: rejects disallowed origin", async () => {
  const sealed = sealCrossHandoffPayload(
    {
      productId: BUTTERFLY_PRODUCT_ID,
      landingSlug: "valshebni-peperudi",
      campaign: "butterflies",
      fields: {
        option_razmer_na_komplekta: "komplekt_mini_1_peperuda_2_vodni_koncheta",
        option_coloring: "paints",
      },
    },
    TEST_SECRET,
  );

  const response = await handleCampaignLandingHandoffConsumeGet(
    buildConsumeRequest(sealed, "https://evil.example"),
  );
  assert.equal(response.status, 403);
});

test("buildLandingHandoffPostFieldsFromDraft maps draft selections", () => {
  const draft = {
    values: { [butterflyLegacyPersonalizationFieldId]: "Иван" },
    enabledOptionalFieldIds: [butterflyLegacyPersonalizationFieldId],
    selectedColorOptionIdsByFieldId: {},
    optionSelections: [
      { groupId: groupRazmerId, valueIds: [valueMaxiId] },
      { groupId: groupColoringId, valueIds: [valueMarkersId] },
    ],
  };

  const built = buildLandingHandoffPostFieldsFromDraft(
    butterflyConservativeProduct,
    "valshebni-peperudi",
    draft,
  );
  assert.equal(built.ok, true);
  if (!built.ok) return;

  assert.equal(built.fields.option_razmer_na_komplekta, "komplekt_maksi_3_peperuda_4_vodni_koncheta");
  assert.equal(built.fields.option_coloring, "markers");
  assert.equal(
    built.fields[CROSS_HANDOFF_PERSONALIZATION_POST_KEY],
    "Иван",
  );

  const validation = validateStoreToLandingHandoff(butterflyConservativeProduct, {
    ok: true,
    productId: BUTTERFLY_PRODUCT_ID,
    landingSlug: "valshebni-peperudi",
    fields: {
      option_razmer_na_komplekta: built.fields.option_razmer_na_komplekta!,
      option_coloring: built.fields.option_coloring!,
      [CROSS_HANDOFF_PERSONALIZATION_POST_KEY]: built.fields[CROSS_HANDOFF_PERSONALIZATION_POST_KEY]!,
    },
  });
  assert.equal(validation.ok, true);
});

test("buildLandingHandoffPostFieldsFromDraft fails when required options missing", () => {
  const built = buildLandingHandoffPostFieldsFromDraft(
    butterflyConservativeProduct,
    "valshebni-peperudi",
    {
      values: {},
      enabledOptionalFieldIds: [],
      selectedColorOptionIdsByFieldId: {},
      optionSelections: [{ groupId: groupRazmerId, valueIds: [valueMiniId] }],
    },
  );
  assert.equal(built.ok, false);
});

test("cross-handoff allowlist blocks unexpected field keys", () => {
  assert.throws(() => {
    sealCrossHandoffPayload(
      {
        productId: BUTTERFLY_PRODUCT_ID,
        landingSlug: "valshebni-peperudi",
        campaign: "butterflies",
        fields: {
          option_razmer_na_komplekta: "komplekt_mini_1_peperuda_2_vodni_koncheta",
          option_coloring: "paints",
          email: "secret@example.com",
        },
      },
      TEST_SECRET,
    );
  });

  assert.equal(ALLOWED_CROSS_HANDOFF_FIELD_KEYS.has(`pf_${BUTTERFLY_LEGACY_PERSONALIZATION_FIELD_KEY}`), true);
});

test("landing handoff draft without personalization omits pf field", () => {
  const built = buildLandingHandoffPostFieldsFromDraft(
    butterflyConservativeProduct,
    "valshebni-peperudi",
    {
      values: {},
      enabledOptionalFieldIds: [],
      selectedColorOptionIdsByFieldId: {},
      optionSelections: [
        { groupId: groupRazmerId, valueIds: [valueMiniId] },
        { groupId: groupColoringId, valueIds: [valuePaintsId] },
      ],
    },
  );
  assert.equal(built.ok, true);
  if (!built.ok) return;
  assert.equal(built.fields[CROSS_HANDOFF_PERSONALIZATION_POST_KEY], undefined);
});
