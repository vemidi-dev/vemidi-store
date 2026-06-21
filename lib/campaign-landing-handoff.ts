import {
  BLOCKED_HANDOFF_QUERY_KEYS,
  evaluateCampaignHandoff,
  parseCampaignHandoffQuery,
} from "@/lib/campaign-handoff";
import {
  ALLOWED_CROSS_HANDOFF_FIELD_KEYS,
  BUTTERFLY_CAMPAIGN_CODE,
  sanitizeCrossHandoffPersonalization,
} from "@/lib/campaign-cross-handoff";
import { CROSS_HANDOFF_PERSONALIZATION_POST_KEY } from "@/lib/campaign-landing-handoff-client";
import type { Product } from "@/lib/catalog";
import { buildProductLandingUrl, getLandingBaseUrl } from "@/lib/product-landing/url";
import { validateLandingSlug } from "@/lib/product-landing/validation";

export { buildLandingHandoffPostFieldsFromDraft } from "@/lib/campaign-landing-handoff-client";

export const LANDING_HANDOFF_POST_CONTENT_TYPE = "application/x-www-form-urlencoded";
export const LANDING_HANDOFF_MAX_BODY_BYTES = 4096;

export const ALLOWED_LANDING_HANDOFF_POST_FIELDS = new Set([
  "product",
  "landingSlug",
  "option_razmer_na_komplekta",
  "option_coloring",
  CROSS_HANDOFF_PERSONALIZATION_POST_KEY,
]);

export type LandingHandoffPostParseResult =
  | {
      ok: true;
      productId: string;
      landingSlug: string;
      fields: Record<string, string>;
    }
  | { ok: false; status: number; error: string };

export type LandingHandoffValidationResult =
  | {
      ok: true;
      product: Product;
      landingSlug: string;
      landingUrl: string;
      campaign: string;
      crossHandoffFields: Record<string, string>;
    }
  | { ok: false; status: number; error: string };

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export function parseLandingHandoffPostBody(
  body: URLSearchParams,
): LandingHandoffPostParseResult {
  const fields: Record<string, string> = {};

  for (const [rawKey, rawValue] of body.entries()) {
    const key = rawKey.trim();
    const value = String(rawValue ?? "").trim();

    if (!key) {
      continue;
    }

    const normalizedKey = key.toLowerCase();
    if (BLOCKED_HANDOFF_QUERY_KEYS.has(normalizedKey)) {
      return { ok: false, status: 400, error: "Непозволени параметри в заявката." };
    }

    if (!ALLOWED_LANDING_HANDOFF_POST_FIELDS.has(key)) {
      return { ok: false, status: 400, error: "Непозволено поле в заявката." };
    }

    if (fields[key]) {
      return { ok: false, status: 400, error: "Дублирано поле в заявката." };
    }

    if (!value) {
      continue;
    }

    fields[key] = value;
  }

  const productId = fields.product ?? "";
  const landingSlug = fields.landingSlug ?? "";

  if (!productId || !isUuid(productId)) {
    return { ok: false, status: 400, error: "Невалиден продукт." };
  }

  const slugValidation = validateLandingSlug(landingSlug);
  if (!slugValidation.ok) {
    return { ok: false, status: 400, error: "Невалиден landing slug." };
  }

  const crossHandoffFields: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (ALLOWED_CROSS_HANDOFF_FIELD_KEYS.has(key)) {
      crossHandoffFields[key] = value;
    }
  }

  if (!crossHandoffFields.option_razmer_na_komplekta) {
    return { ok: false, status: 400, error: "Липсва размер на комплекта." };
  }

  if (!crossHandoffFields.option_coloring) {
    return { ok: false, status: 400, error: "Липсва оцветяване." };
  }

  return {
    ok: true,
    productId,
    landingSlug: slugValidation.slug,
    fields: crossHandoffFields,
  };
}

export function resolveTrustedLandingUrl(slug: string) {
  return buildProductLandingUrl(slug, getLandingBaseUrl());
}

export function validateStoreToLandingHandoff(
  product: Product | null,
  parsed: Extract<LandingHandoffPostParseResult, { ok: true }>,
): LandingHandoffValidationResult {
  const landingUrl = resolveTrustedLandingUrl(parsed.landingSlug);
  if (!landingUrl) {
    return { ok: false, status: 400, error: "Невалиден landing адрес." };
  }

  if (!product || product.id !== parsed.productId || !product.orderable) {
    return { ok: false, status: 400, error: "Продуктът не е наличен." };
  }

  const handoffFields = { ...parsed.fields };
  const personalizationRaw = handoffFields[CROSS_HANDOFF_PERSONALIZATION_POST_KEY];
  if (personalizationRaw) {
    const sanitized = sanitizeCrossHandoffPersonalization(personalizationRaw);
    if (!sanitized) {
      return { ok: false, status: 400, error: "Невалидна персонализация." };
    }
    handoffFields[CROSS_HANDOFF_PERSONALIZATION_POST_KEY] = sanitized;
  }

  const query = parseCampaignHandoffQuery({
    product: parsed.productId,
    campaign: BUTTERFLY_CAMPAIGN_CODE,
    source: `campaign-${BUTTERFLY_CAMPAIGN_CODE}`,
    landing: landingUrl,
    quantity: "1",
    ...handoffFields,
  });

  if (query.unknownKeys.length > 0) {
    return { ok: false, status: 400, error: "Невалидна конфигурация." };
  }

  const evaluation = evaluateCampaignHandoff(product, query);
  if (evaluation.status === "invalid") {
    return { ok: false, status: 400, error: evaluation.message };
  }

  if (evaluation.status === "needs_configuration") {
    return {
      ok: false,
      status: 422,
      error: "Избраната конфигурация не е пълна. Моля, изберете всички опции.",
    };
  }

  return {
    ok: true,
    product,
    landingSlug: parsed.landingSlug,
    landingUrl,
    campaign: BUTTERFLY_CAMPAIGN_CODE,
    crossHandoffFields: handoffFields,
  };
}
