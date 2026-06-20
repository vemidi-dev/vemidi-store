import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  buildCampaignHandoffClearCookieHeader,
  CAMPAIGN_HANDOFF_COOKIE_NAME,
  CAMPAIGN_HANDOFF_COOKIE_PATH,
  isCampaignHandoffSecureRequest,
} from "@/lib/campaign-handoff-cookie-config";

export const campaignCheckoutMiddlewareMatcher = "/campaign-checkout";

export function hasCampaignHandoffQueryParams(searchParams: URLSearchParams) {
  for (const key of searchParams.keys()) {
    const normalized = key.trim().toLowerCase();
    if (
      normalized === "product" ||
      normalized.startsWith("option_") ||
      normalized.startsWith("pf_") ||
      normalized.startsWith("color_") ||
      normalized.startsWith("option_text_")
    ) {
      return true;
    }
  }

  return false;
}

export function shouldClearCampaignHandoffCookie(request: NextRequest) {
  return (
    request.method === "GET" &&
    request.nextUrl.pathname === CAMPAIGN_HANDOFF_COOKIE_PATH &&
    request.cookies.has(CAMPAIGN_HANDOFF_COOKIE_NAME)
  );
}

export function appendCampaignHandoffClearCookie(
  request: NextRequest,
  response: NextResponse,
) {
  const secure = isCampaignHandoffSecureRequest(request);
  response.headers.append(
    "Set-Cookie",
    buildCampaignHandoffClearCookieHeader(secure),
  );
  return response;
}

export function handleCampaignCheckoutHandoffMiddleware(request: NextRequest) {
  if (!shouldClearCampaignHandoffCookie(request)) {
    return null;
  }

  const response = NextResponse.next();
  return appendCampaignHandoffClearCookie(request, response);
}
