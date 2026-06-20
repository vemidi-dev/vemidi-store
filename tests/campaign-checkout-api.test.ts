import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";

import {
  buildCampaignHandoffClearCookieHeader,
  buildCampaignHandoffSetCookieHeader,
  CAMPAIGN_HANDOFF_COOKIE_MAX_AGE_SECONDS,
  CAMPAIGN_HANDOFF_COOKIE_NAME,
  CAMPAIGN_HANDOFF_COOKIE_PATH,
  openCampaignHandoffPayload,
  sealCampaignHandoffPayload,
} from "@/lib/campaign-handoff-cookie";
import { consumeCampaignHandoffCookie } from "@/lib/campaign-handoff-consume";
import {
  ALLOWED_CAMPAIGN_POST_FIELDS,
  CAMPAIGN_HANDOFF_MAX_BODY_BYTES,
  CAMPAIGN_HANDOFF_POST_CONTENT_TYPE,
  buildCampaignHandoffCorsHeaders,
  getCampaignHandoffAllowedOrigins,
  isAllowedCampaignHandoffOrigin,
  parseCampaignHandoffPostBody,
} from "@/lib/campaign-handoff-post";
import { handleCampaignCheckoutPost } from "@/lib/campaign-handoff-request";
import { evaluateCampaignHandoff, parseCampaignHandoffQuery } from "@/lib/campaign-handoff";
import {
  BUTTERFLY_LEGACY_PERSONALIZATION_FIELD_KEY,
  butterflyConservativeProduct,
  butterflyPostHandoffFields,
  butterflyPostHandoffWithNameFields,
  groupColoringId,
  groupRazmerId,
  valueMiniId,
  valuePaintsId,
} from "@/tests/fixtures/butterfly-conservative-handoff";

const TEST_SECRET = "test-campaign-handoff-secret";
const PRODUCTION_ORIGIN = "https://special.vemidi-crafts.com";
const PREVIEW_ORIGIN = "http://localhost:3000";

function encodeFormBody(fields: Record<string, string>) {
  return new URLSearchParams(fields).toString();
}

function buildPostRequest(
  fields: Record<string, string>,
  origin = PRODUCTION_ORIGIN,
  extraHeaders: Record<string, string> = {},
) {
  const body = encodeFormBody(fields);
  return new Request("https://vemidi-crafts.com/api/campaign-checkout", {
    method: "POST",
    headers: {
      "content-type": CAMPAIGN_HANDOFF_POST_CONTENT_TYPE,
      origin,
      "x-forwarded-proto": "https",
      ...extraHeaders,
    },
    body,
  });
}

beforeEach(() => {
  process.env.CAMPAIGN_HANDOFF_SECRET = TEST_SECRET;
  process.env.CAMPAIGN_HANDOFF_ALLOWED_ORIGINS = PREVIEW_ORIGIN;
});

afterEach(() => {
  delete process.env.CAMPAIGN_HANDOFF_SECRET;
  delete process.env.CAMPAIGN_HANDOFF_ALLOWED_ORIGINS;
});

test("campaign checkout POST: valid request without personalization redirects to consume page", async () => {
  const response = await handleCampaignCheckoutPost(buildPostRequest(butterflyPostHandoffFields), {
    getProduct: async () => butterflyConservativeProduct,
  });

  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), "/campaign-checkout");
  assert.ok(response.headers.get("set-cookie")?.includes(CAMPAIGN_HANDOFF_COOKIE_NAME));
  assert.doesNotMatch(response.headers.get("location") ?? "", /мария|pf_|option_/i);
});

test("campaign checkout POST: valid request with legacy name redirects without PII in URL", async () => {
  const response = await handleCampaignCheckoutPost(
    buildPostRequest(butterflyPostHandoffWithNameFields),
    { getProduct: async () => butterflyConservativeProduct },
  );

  assert.equal(response.status, 303);
  const location = response.headers.get("location") ?? "";
  assert.equal(location, "/campaign-checkout");
  assert.doesNotMatch(location, /мария|maria|pf_|name=/i);
});

test("campaign checkout POST: cookie consume yields ready checkout with correct options", async () => {
  const query = parseCampaignHandoffQuery(butterflyPostHandoffWithNameFields);
  const evaluation = evaluateCampaignHandoff(butterflyConservativeProduct, query);
  assert.equal(evaluation.status, "ready");
  if (evaluation.status !== "ready") {
    return;
  }

  const sealed = sealCampaignHandoffPayload(
    butterflyPostHandoffWithNameFields,
    evaluation,
    TEST_SECRET,
  );
  const consumed = await consumeCampaignHandoffCookie(sealed, async () => butterflyConservativeProduct);

  assert.equal(consumed.ok, true);
  if (!consumed.ok) {
    return;
  }

  assert.equal(consumed.result.optionSelections?.length, 2);
  assert.equal(consumed.result.optionSelections?.[0]?.groupId, groupRazmerId);
  assert.equal(consumed.result.optionSelections?.[0]?.valueIds[0], valueMiniId);
  assert.equal(consumed.result.optionSelections?.[1]?.groupId, groupColoringId);
  assert.equal(consumed.result.optionSelections?.[1]?.valueIds[0], valuePaintsId);
  assert.equal(consumed.result.personalizationFields?.[0]?.value, "Мария");
});

test("campaign checkout POST: server-side price ignores forged price fields", async () => {
  const parsed = parseCampaignHandoffPostBody(
    new URLSearchParams({
      ...butterflyPostHandoffFields,
      price: "1",
    }),
  );

  assert.equal(parsed.ok, false);
  if (parsed.ok) {
    return;
  }
  assert.equal(parsed.status, 400);
});

test("campaign checkout POST: rejects unknown option field", async () => {
  const parsed = parseCampaignHandoffPostBody(
    new URLSearchParams({
      ...butterflyPostHandoffFields,
      option_kit_size: "mini",
    }),
  );

  assert.equal(parsed.ok, false);
});

test("campaign checkout POST: rejects blocked email field", async () => {
  const parsed = parseCampaignHandoffPostBody(
    new URLSearchParams({
      ...butterflyPostHandoffFields,
      email: "test@example.com",
    }),
  );

  assert.equal(parsed.ok, false);
});

test("campaign checkout POST: rejects invalid origin", async () => {
  const response = await handleCampaignCheckoutPost(
    buildPostRequest(butterflyPostHandoffFields, "https://evil.example"),
    { getProduct: async () => butterflyConservativeProduct },
  );

  assert.equal(response.status, 403);
  const cors = buildCampaignHandoffCorsHeaders("https://evil.example");
  assert.equal(Object.keys(cors).length, 0);
});

test("campaign checkout POST: allows configured preview origin", async () => {
  assert.equal(isAllowedCampaignHandoffOrigin(PREVIEW_ORIGIN), true);
  const response = await handleCampaignCheckoutPost(
    buildPostRequest(butterflyPostHandoffFields, PREVIEW_ORIGIN),
    { getProduct: async () => butterflyConservativeProduct },
  );
  assert.equal(response.status, 303);
  assert.equal(
    buildCampaignHandoffCorsHeaders(PREVIEW_ORIGIN)["Access-Control-Allow-Origin"],
    PREVIEW_ORIGIN,
  );
});

test("campaign checkout POST: rejects oversized payload", async () => {
  const oversizedValue = "x".repeat(CAMPAIGN_HANDOFF_MAX_BODY_BYTES);
  const response = await handleCampaignCheckoutPost(
    buildPostRequest({
      ...butterflyPostHandoffFields,
      [`pf_${BUTTERFLY_LEGACY_PERSONALIZATION_FIELD_KEY}`]: oversizedValue,
    }),
    { getProduct: async () => butterflyConservativeProduct },
  );

  assert.equal(response.status, 413);
});

test("campaign checkout cookie: tampered payload fails consume", async () => {
  const query = parseCampaignHandoffQuery(butterflyPostHandoffFields);
  const evaluation = evaluateCampaignHandoff(butterflyConservativeProduct, query);
  assert.equal(evaluation.status, "ready");
  if (evaluation.status !== "ready") {
    return;
  }

  const sealed = sealCampaignHandoffPayload(
    butterflyPostHandoffFields,
    evaluation,
    TEST_SECRET,
  );
  const tampered = `${sealed.slice(0, -4)}aaaa`;
  const consumed = await consumeCampaignHandoffCookie(tampered, async () => butterflyConservativeProduct);
  assert.equal(consumed.ok, false);
});

test("campaign checkout cookie: expired payload fails consume", async () => {
  const query = parseCampaignHandoffQuery(butterflyPostHandoffFields);
  const evaluation = evaluateCampaignHandoff(butterflyConservativeProduct, query);
  assert.equal(evaluation.status, "ready");
  if (evaluation.status !== "ready") {
    return;
  }

  const sealed = sealCampaignHandoffPayload(
    butterflyPostHandoffFields,
    evaluation,
    TEST_SECRET,
    Date.now() - CAMPAIGN_HANDOFF_COOKIE_MAX_AGE_SECONDS * 1000 - 1000,
  );
  const consumed = await consumeCampaignHandoffCookie(sealed, async () => butterflyConservativeProduct);
  assert.equal(consumed.ok, false);
  if (consumed.ok) {
    return;
  }
  assert.match(consumed.message, /изтекла/i);
});

test("campaign checkout cookie: second consume fails after one-time use semantics", async () => {
  const query = parseCampaignHandoffQuery(butterflyPostHandoffFields);
  const evaluation = evaluateCampaignHandoff(butterflyConservativeProduct, query);
  assert.equal(evaluation.status, "ready");
  if (evaluation.status !== "ready") {
    return;
  }

  const sealed = sealCampaignHandoffPayload(
    butterflyPostHandoffFields,
    evaluation,
    TEST_SECRET,
  );
  const first = await consumeCampaignHandoffCookie(sealed, async () => butterflyConservativeProduct);
  const second = await consumeCampaignHandoffCookie(undefined, async () => butterflyConservativeProduct);

  assert.equal(first.ok, true);
  assert.equal(second.ok, false);
});

test("campaign checkout cookie: set-cookie uses security attributes", () => {
  const header = buildCampaignHandoffSetCookieHeader("sealed-value", true);
  assert.match(header, new RegExp(`${CAMPAIGN_HANDOFF_COOKIE_NAME}=sealed-value`));
  assert.match(header, /HttpOnly/i);
  assert.match(header, /SameSite=Lax/i);
  assert.match(header, new RegExp(`Path=${CAMPAIGN_HANDOFF_COOKIE_PATH}`));
  assert.match(header, /Secure/i);
  assert.match(header, new RegExp(`Max-Age=${CAMPAIGN_HANDOFF_COOKIE_MAX_AGE_SECONDS}`));
});

test("campaign checkout cookie: clear-cookie uses security attributes", () => {
  const header = buildCampaignHandoffClearCookieHeader(true);
  assert.match(header, new RegExp(`${CAMPAIGN_HANDOFF_COOKIE_NAME}=`));
  assert.match(header, /Max-Age=0/i);
  assert.match(header, /HttpOnly/i);
});

test("campaign checkout POST: allowed field whitelist matches butterfly contract", () => {
  for (const field of Object.keys(butterflyPostHandoffWithNameFields)) {
    assert.equal(ALLOWED_CAMPAIGN_POST_FIELDS.has(field), true, field);
  }
  assert.equal(ALLOWED_CAMPAIGN_POST_FIELDS.has("option_personalization"), false);
  assert.equal(ALLOWED_CAMPAIGN_POST_FIELDS.has("option_text_child_name"), false);
});

test("campaign checkout POST: production origin is always allowed", () => {
  const origins = getCampaignHandoffAllowedOrigins();
  assert.equal(origins.has(PRODUCTION_ORIGIN), true);
});

test("campaign checkout POST: handler does not log PII from request body", async () => {
  const logs: string[] = [];
  const originalError = console.error;
  const originalLog = console.log;
  console.error = (...args: unknown[]) => {
    logs.push(args.map(String).join(" "));
  };
  console.log = (...args: unknown[]) => {
    logs.push(args.map(String).join(" "));
  };

  try {
    await handleCampaignCheckoutPost(
      buildPostRequest(butterflyPostHandoffWithNameFields),
      { getProduct: async () => butterflyConservativeProduct },
    );
  } finally {
    console.error = originalError;
    console.log = originalLog;
  }

  const combined = logs.join("\n").toLowerCase();
  assert.doesNotMatch(combined, /мария/);
  assert.doesNotMatch(combined, /pf_field_/);
});

test("campaign checkout cookie: open validates structure after decrypt", () => {
  const query = parseCampaignHandoffQuery(butterflyPostHandoffFields);
  const evaluation = evaluateCampaignHandoff(butterflyConservativeProduct, query);
  assert.equal(evaluation.status, "ready");
  if (evaluation.status !== "ready") {
    return;
  }

  const sealed = sealCampaignHandoffPayload(
    butterflyPostHandoffFields,
    evaluation,
    TEST_SECRET,
  );
  const opened = openCampaignHandoffPayload(sealed, TEST_SECRET);
  assert.equal(opened.ok, true);
  if (!opened.ok) {
    return;
  }
  assert.deepEqual(opened.payload.fields, butterflyPostHandoffFields);
});
