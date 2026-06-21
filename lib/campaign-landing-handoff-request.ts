import { NextResponse } from "next/server";

import {
  mapCrossHandoffFieldsToFormState,
  openCrossHandoffPayload,
  sealCrossHandoffPayload,
  validateCrossHandoffFormState,
} from "@/lib/campaign-cross-handoff";
import {
  buildCrossHandoffClearCookieHeader,
  buildCrossHandoffSetCookieHeader,
  isCrossHandoffSecureRequest,
  resolveCrossHandoffCookieScope,
} from "@/lib/campaign-cross-handoff-cookie-config";
import { getCampaignHandoffSecret } from "@/lib/campaign-handoff-cookie";
import {
  getCampaignHandoffAllowedOrigins,
  isAllowedCampaignHandoffOrigin,
  resolveCampaignHandoffOrigin,
} from "@/lib/campaign-handoff-post";
import {
  LANDING_HANDOFF_MAX_BODY_BYTES,
  LANDING_HANDOFF_POST_CONTENT_TYPE,
  parseLandingHandoffPostBody,
  validateStoreToLandingHandoff,
} from "@/lib/campaign-landing-handoff";
import { getStorefrontProduct } from "@/lib/storefront/repository";

export type CampaignLandingHandoffDeps = {
  getProduct?: typeof getStorefrontProduct;
};

const CROSS_HANDOFF_COOKIE_PATTERN = /(?:^|;\s*)vemidi_cross_handoff=([^;]*)/;

function jsonError(message: string, status: number, headers: Record<string, string> = {}) {
  return NextResponse.json({ ok: false, error: message }, { status, headers });
}

function buildLandingHandoffConsumeCorsHeaders(origin: string | null): Record<string, string> {
  if (!origin || !isAllowedCampaignHandoffOrigin(origin)) {
    return {};
  }

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

function parseCrossHandoffCookie(cookieHeader: string | null) {
  if (!cookieHeader) {
    return null;
  }

  const match = cookieHeader.match(CROSS_HANDOFF_COOKIE_PATTERN);
  const value = match?.[1]?.trim();
  return value ? decodeURIComponent(value) : null;
}

function resolveRequestHostname(request: Request) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  return host.split(",")[0]?.trim().split(":")[0]?.toLowerCase() ?? "";
}

export async function handleCampaignLandingHandoffPost(
  request: Request,
  deps: CampaignLandingHandoffDeps = {},
) {
  const requestOrigin = new URL(request.url).origin;
  const origin = resolveCampaignHandoffOrigin(request);

  if (origin && origin !== requestOrigin && !isAllowedCampaignHandoffOrigin(origin)) {
    return jsonError("Непозволен източник на заявката.", 403);
  }

  if (!origin) {
    const referer = request.headers.get("referer")?.trim();
    if (referer) {
      try {
        const refererOrigin = new URL(referer).origin;
        if (refererOrigin !== requestOrigin) {
          return jsonError("Непозволен източник на заявката.", 403);
        }
      } catch {
        return jsonError("Непозволен източник на заявката.", 403);
      }
    }
  }

  const contentType = request.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
  if (contentType !== LANDING_HANDOFF_POST_CONTENT_TYPE) {
    return jsonError("Невалиден тип на заявката.", 415);
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > LANDING_HANDOFF_MAX_BODY_BYTES) {
    return jsonError("Заявката е твърде голяма.", 413);
  }

  const parsedBody = parseLandingHandoffPostBody(new URLSearchParams(rawBody));
  if (!parsedBody.ok) {
    return jsonError(parsedBody.error, parsedBody.status);
  }

  const getProduct = deps.getProduct ?? getStorefrontProduct;
  const product = await getProduct(parsedBody.productId);
  const validation = validateStoreToLandingHandoff(product, parsedBody);
  if (!validation.ok) {
    return jsonError(validation.error, validation.status);
  }

  const secret = getCampaignHandoffSecret();
  if (!secret) {
    return jsonError("Handoff услугата временно не е налична.", 503);
  }

  const sealed = sealCrossHandoffPayload(
    {
      productId: validation.product.id,
      landingSlug: validation.landingSlug,
      campaign: validation.campaign,
      fields: validation.crossHandoffFields,
    },
    secret,
  );

  const secure = isCrossHandoffSecureRequest(request);
  const scope = resolveCrossHandoffCookieScope(resolveRequestHostname(request));
  const redirectUrl = new URL(validation.landingUrl);

  return new NextResponse(null, {
    status: 303,
    headers: {
      Location: redirectUrl.toString(),
      "Set-Cookie": buildCrossHandoffSetCookieHeader(sealed, secure, scope),
      "Cache-Control": "no-store",
    },
  });
}

export async function handleCampaignLandingHandoffConsumeGet(request: Request) {
  const origin = resolveCampaignHandoffOrigin(request);
  const corsHeaders = buildLandingHandoffConsumeCorsHeaders(origin);

  if (!origin || !isAllowedCampaignHandoffOrigin(origin)) {
    return jsonError("Непозволен източник на заявката.", 403, corsHeaders);
  }

  const sealed = parseCrossHandoffCookie(request.headers.get("cookie"));
  if (!sealed) {
    return jsonError("Handoff не е намерен.", 404, corsHeaders);
  }

  const secret = getCampaignHandoffSecret();
  if (!secret) {
    return jsonError("Handoff услугата временно не е налична.", 503, corsHeaders);
  }

  const opened = openCrossHandoffPayload(sealed, secret);
  if (!opened.ok) {
    const status = opened.reason === "expired" ? 410 : 400;
    return jsonError("Handoff е невалиден или изтекъл.", status, corsHeaders);
  }

  const formState = mapCrossHandoffFieldsToFormState(opened.payload.fields);
  if (!formState || !validateCrossHandoffFormState(formState)) {
    return jsonError("Handoff конфигурацията е невалидна.", 400, corsHeaders);
  }

  const secure = isCrossHandoffSecureRequest(request);
  const scope = resolveCrossHandoffCookieScope(resolveRequestHostname(request));

  return NextResponse.json(
    { ok: true, formState },
    {
      status: 200,
      headers: {
        ...corsHeaders,
        "Set-Cookie": buildCrossHandoffClearCookieHeader(secure, scope),
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function handleCampaignLandingHandoffConsumeOptions(request: Request) {
  const origin = resolveCampaignHandoffOrigin(request);
  if (!origin || !getCampaignHandoffAllowedOrigins().has(origin)) {
    return new NextResponse(null, { status: 403 });
  }

  return new NextResponse(null, {
    status: 204,
    headers: buildLandingHandoffConsumeCorsHeaders(origin),
  });
}

export async function handleCampaignLandingHandoffOptions() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: "POST, OPTIONS",
    },
  });
}
