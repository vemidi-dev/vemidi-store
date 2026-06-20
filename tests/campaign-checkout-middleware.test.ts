import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { NextRequest, NextResponse } from "next/server";

import {
  buildCampaignHandoffClearCookieHeader,
  CAMPAIGN_HANDOFF_COOKIE_NAME,
  CAMPAIGN_HANDOFF_COOKIE_PATH,
} from "@/lib/campaign-handoff-cookie-config";
import {
  appendCampaignHandoffClearCookie,
  handleCampaignCheckoutHandoffMiddleware,
  hasCampaignHandoffQueryParams,
  shouldClearCampaignHandoffCookie,
} from "@/lib/middleware/campaign-checkout-handoff";
import { BUTTERFLY_PRODUCT_ID } from "@/tests/fixtures/butterfly-conservative-handoff";

function buildCampaignCheckoutRequest(
  search = "",
  cookieValue?: string,
  method = "GET",
) {
  const headers: Record<string, string> = {};
  if (cookieValue) {
    headers.cookie = `${CAMPAIGN_HANDOFF_COOKIE_NAME}=${cookieValue}`;
  }

  return new NextRequest(`https://vemidi-crafts.com/campaign-checkout${search}`, {
    method,
    headers,
  });
}

test("campaign checkout page: Server Component does not mutate cookies", () => {
  const source = readFileSync(
    join(process.cwd(), "app/campaign-checkout/page.tsx"),
    "utf8",
  );

  assert.doesNotMatch(source, /cookieStore\.delete\s*\(/);
  assert.doesNotMatch(source, /cookies\(\)\.delete\s*\(/);
});

test("campaign checkout middleware: clears cookie with exact Path on GET", () => {
  const request = buildCampaignCheckoutRequest("", "sealed-payload");
  assert.equal(shouldClearCampaignHandoffCookie(request), true);

  const response = handleCampaignCheckoutHandoffMiddleware(request);
  assert.ok(response);

  const setCookie = response!.headers.get("set-cookie") ?? "";
  assert.match(setCookie, new RegExp(`${CAMPAIGN_HANDOFF_COOKIE_NAME}=`));
  assert.match(setCookie, new RegExp(`Path=${CAMPAIGN_HANDOFF_COOKIE_PATH}`));
  assert.match(setCookie, /Max-Age=0/i);
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /SameSite=Lax/i);
});

test("campaign checkout middleware: continues request and preserves incoming cookie", () => {
  const request = buildCampaignCheckoutRequest("", "sealed-payload");
  const response = handleCampaignCheckoutHandoffMiddleware(request);

  assert.ok(response);
  assert.equal(response!.status, 200);
  assert.equal(request.cookies.get(CAMPAIGN_HANDOFF_COOKIE_NAME)?.value, "sealed-payload");
  assert.ok(response!.headers.get("set-cookie"));
});

test("campaign checkout middleware: legacy query with cookie still clears stale cookie", () => {
  const search = `?product=${BUTTERFLY_PRODUCT_ID}&campaign=butterflies&option_razmer_na_komplekta=mini`;
  const request = buildCampaignCheckoutRequest(search, "sealed-payload");

  assert.equal(hasCampaignHandoffQueryParams(request.nextUrl.searchParams), true);
  assert.equal(shouldClearCampaignHandoffCookie(request), true);

  const response = handleCampaignCheckoutHandoffMiddleware(request);
  assert.ok(response);
  assert.match(response!.headers.get("set-cookie") ?? "", /Max-Age=0/i);
});

test("campaign checkout middleware: skips non-GET methods", () => {
  const request = buildCampaignCheckoutRequest("", "sealed-payload", "POST");
  assert.equal(shouldClearCampaignHandoffCookie(request), false);
  assert.equal(handleCampaignCheckoutHandoffMiddleware(request), null);
});

test("campaign checkout middleware: skips when cookie is absent", () => {
  const request = buildCampaignCheckoutRequest("");
  assert.equal(shouldClearCampaignHandoffCookie(request), false);
  assert.equal(handleCampaignCheckoutHandoffMiddleware(request), null);
});

test("campaign checkout middleware: clear header matches shared helper", () => {
  const request = buildCampaignCheckoutRequest("", "sealed-payload");
  const response = handleCampaignCheckoutHandoffMiddleware(request);
  assert.ok(response);

  const expected = buildCampaignHandoffClearCookieHeader(true);
  assert.equal(response!.headers.get("set-cookie"), expected);
});

test("campaign checkout middleware: append helper can augment existing response", () => {
  const request = buildCampaignCheckoutRequest("", "sealed-payload");
  const response = appendCampaignHandoffClearCookie(
    request,
    NextResponse.next(),
  );

  assert.match(response.headers.get("set-cookie") ?? "", /Max-Age=0/i);
});

test("hasCampaignHandoffQueryParams detects legacy handoff keys", () => {
  assert.equal(
    hasCampaignHandoffQueryParams(
      new URLSearchParams(`product=${BUTTERFLY_PRODUCT_ID}`),
    ),
    true,
  );
  assert.equal(
    hasCampaignHandoffQueryParams(new URLSearchParams("campaign=butterflies")),
    false,
  );
});
