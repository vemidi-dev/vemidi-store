import { NextResponse } from "next/server";

import {
  buildCampaignHandoffSetCookieHeader,
  getCampaignHandoffSecret,
  sealCampaignHandoffPayload,
} from "@/lib/campaign-handoff-cookie";
import { isCampaignHandoffSecureRequest } from "@/lib/campaign-handoff-cookie-config";
import { evaluateCampaignHandoff } from "@/lib/campaign-handoff";
import {
  buildCampaignHandoffCorsHeaders,
  CAMPAIGN_HANDOFF_MAX_BODY_BYTES,
  CAMPAIGN_HANDOFF_POST_CONTENT_TYPE,
  isAllowedCampaignHandoffOrigin,
  parseCampaignHandoffPostBody,
  resolveCampaignHandoffOrigin,
} from "@/lib/campaign-handoff-post";
import { getStorefrontProduct } from "@/lib/storefront/repository";

export type CampaignCheckoutPostDeps = {
  getProduct?: typeof getStorefrontProduct;
};

function jsonError(message: string, status: number, origin: string | null) {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: buildCampaignHandoffCorsHeaders(origin),
    },
  );
}

function isSecureRequest(request: Request) {
  return isCampaignHandoffSecureRequest(request);
}

export async function handleCampaignCheckoutPost(
  request: Request,
  deps: CampaignCheckoutPostDeps = {},
) {
  const origin = resolveCampaignHandoffOrigin(request);
  const getProduct = deps.getProduct ?? getStorefrontProduct;

  if (!isAllowedCampaignHandoffOrigin(origin)) {
    return jsonError("Непозволен източник на заявката.", 403, origin);
  }

  const contentType = request.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
  if (contentType !== CAMPAIGN_HANDOFF_POST_CONTENT_TYPE) {
    return jsonError("Невалиден тип на заявката.", 415, origin);
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > CAMPAIGN_HANDOFF_MAX_BODY_BYTES) {
    return jsonError("Заявката е твърде голяма.", 413, origin);
  }

  const parsedBody = parseCampaignHandoffPostBody(new URLSearchParams(rawBody));
  if (!parsedBody.ok) {
    return jsonError(parsedBody.error, parsedBody.status, origin);
  }

  const product = parsedBody.query.productId
    ? await getProduct(parsedBody.query.productId)
    : null;
  const evaluation = evaluateCampaignHandoff(product, parsedBody.query);

  if (evaluation.status === "invalid") {
    return jsonError(evaluation.message, 400, origin);
  }

  if (evaluation.status === "needs_configuration") {
    return jsonError(
      "Избраната конфигурация изисква допълнителни стъпки в магазина.",
      422,
      origin,
    );
  }

  const secret = getCampaignHandoffSecret();
  if (!secret) {
    return jsonError("Handoff услугата временно не е налична.", 503, origin);
  }

  const sealed = sealCampaignHandoffPayload(parsedBody.fields, evaluation, secret);
  const consumeUrl = new URL("/campaign-checkout", request.url);

  return new NextResponse(null, {
    status: 303,
    headers: {
      ...buildCampaignHandoffCorsHeaders(origin),
      Location: consumeUrl.pathname,
      "Set-Cookie": buildCampaignHandoffSetCookieHeader(
        sealed,
        isSecureRequest(request),
      ),
    },
  });
}

export async function handleCampaignCheckoutOptions(request: Request) {
  const origin = resolveCampaignHandoffOrigin(request);
  if (!isAllowedCampaignHandoffOrigin(origin)) {
    return new NextResponse(null, { status: 403 });
  }

  return new NextResponse(null, {
    status: 204,
    headers: buildCampaignHandoffCorsHeaders(origin),
  });
}
